"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Mic,
  MicOff,
  Sparkles,
  Package,
  Users,
  FileText,
  UserCheck,
  Compass,
  Filter,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  ExternalLink,
  X,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Database,
  CheckSquare,
  Square,
} from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQ = searchParams?.get("q") || "";
  const initialCat = searchParams?.get("category") || "all";

  const [query, setQuery] = useState(initialQ);
  const [activeCategory, setActiveCategory] = useState(initialCat);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // E-Commerce Filters & Sorting
  const [inStockOnly, setInStockOnly] = useState(false);
  const [nearExpiryOnly, setNearExpiryOnly] = useState(false);
  const [highBalanceOnly, setHighBalanceOnly] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");

  // Speech Recognition (Voice Search)
  const [isListening, setIsListening] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState("en-IN");
  const recognitionRef = useRef<any>(null);

  // Dynamic Trending & Results State
  const [dynamicTrending, setDynamicTrending] = useState<any[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [results, setResults] = useState<{
    products: any[];
    customers: any[];
    vouchers: any[];
    users: any[];
    navigation: any[];
  }>({
    products: [],
    customers: [],
    vouchers: [],
    users: [],
    navigation: [],
  });
  const [totalResults, setTotalResults] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load trending when empty
  useEffect(() => {
    if (!query.trim()) {
      fetch("/api/global-search?q=")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.trending)) {
            setDynamicTrending(data.trending);
          }
        })
        .catch(() => {});
    }
  }, [query]);

  // Sync URL search params
  const updateUrl = useCallback(
    (newQ: string, newCat: string) => {
      const params = new URLSearchParams();
      if (newQ.trim()) params.set("q", newQ.trim());
      if (newCat && newCat !== "all") params.set("category", newCat);
      router.replace(`/dashboard/search?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  // Debounced API Search
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        products: [],
        customers: [],
        vouchers: [],
        users: [],
        navigation: [],
      });
      setTotalResults(0);
      setDidYouMean(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      updateUrl(query, activeCategory);

      const params = new URLSearchParams({
        q: query,
        category: activeCategory,
        inStock: inStockOnly ? "true" : "false",
        nearExpiry: nearExpiryOnly ? "true" : "false",
        highBalance: highBalanceOnly ? "true" : "false",
        sortBy: sortBy,
      });

      fetch(`/api/global-search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setResults(data.results);
            setTotalResults(data.totalResults);
            setDidYouMean(data.didYouMean || null);
          }
        })
        .catch((err) => {
          console.error("Search fetch error:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 280);

    return () => clearTimeout(timer);
  }, [query, activeCategory, inStockOnly, nearExpiryOnly, highBalanceOnly, sortBy, updateUrl]);

  // Voice Search Handler
  const toggleVoiceSearch = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    setVoiceError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = selectedLang;

      rec.onstart = () => {
        setIsListening(true);
        setTranscriptPreview("");
      };

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        const combined = (finalTranscript + interimTranscript).trim();
        if (combined) {
          setTranscriptPreview(combined);
          setQuery(combined);
        }
      };

      rec.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "no-speech") {
          setVoiceError("No speech detected. Please tap mic and speak clearly.");
          setTimeout(() => setVoiceError(null), 4000);
          return;
        }
        if (event.error === "aborted") return;

        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setVoiceError("Microphone access denied. Please allow microphone permissions in your browser.");
        } else {
          setVoiceError(`Voice notice: ${event.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Voice search error:", err);
      setIsListening(false);
      setVoiceError("Unable to initialize microphone.");
    }
  };

  // Copy record details
  const copyRecord = (item: any) => {
    try {
      const txt = `${item.title}\nCategory: ${item.category}\nSubtitle: ${item.subtitle}\nDetails: ${JSON.stringify(item.details, null, 2)}`;
      navigator.clipboard.writeText(txt);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const activeList = getFlatResults();
    if (activeList.length === 0) return;

    const headers = ["ID", "Category", "Title", "Subtitle", "Action URL"];
    const rows = activeList.map((item) => [
      `"${item.id || ""}"`,
      `"${item.category || ""}"`,
      `"${(item.title || "").replace(/"/g, '""')}"`,
      `"${(item.subtitle || "").replace(/"/g, '""')}"`,
      `"${item.actionUrl || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mabsol_search_${query || "export"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Flatten active category results
  const getFlatResults = useCallback(() => {
    const flat: any[] = [];
    if (activeCategory === "all" || activeCategory === "products") flat.push(...results.products);
    if (activeCategory === "all" || activeCategory === "customers") flat.push(...results.customers);
    if (activeCategory === "all" || activeCategory === "vouchers") flat.push(...results.vouchers);
    if (activeCategory === "all" || activeCategory === "users") flat.push(...results.users);
    if (activeCategory === "all" || activeCategory === "navigation") flat.push(...results.navigation);
    return flat;
  }, [results, activeCategory]);

  const flatResults = useMemo(() => getFlatResults(), [getFlatResults]);

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Glow ambient backgrounds */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Universal Global Search & Voice AI
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Mabsol CRM Dynamic Search
          </h1>
          <p className="text-sm sm:text-base text-indigo-200 mt-2 max-w-2xl font-medium leading-relaxed">
            Instant search across products, batch stocks, parties, ledger vouchers, sales invoices, MR teams, and live financial metrics with real-time speech recognition.
          </p>

          {/* Search Input Box */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-white/20">
            <div className="flex items-center gap-2.5 flex-1 px-3 w-full">
              <Search className="w-5 h-5 text-indigo-600 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, stock, customer parties, invoices, vouchers, MRs..."
                className="w-full text-slate-800 dark:text-slate-100 placeholder:text-slate-400 bg-transparent text-base sm:text-lg font-semibold outline-none py-1.5"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Language & Voice Mic Action Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3">
              {/* Language Switcher */}
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedLang("en-IN")}
                  className={`px-2.5 py-1.5 transition-colors ${selectedLang === "en-IN" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                  title="Indian English voice input"
                >
                  EN-IN
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLang("hi-IN")}
                  className={`px-2.5 py-1.5 transition-colors ${selectedLang === "hi-IN" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                  title="Hindi voice input"
                >
                  HI-IN
                </button>
              </div>

              {/* Microphone Button */}
              <button
                onClick={toggleVoiceSearch}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${isListening
                    ? "bg-rose-600 text-white animate-pulse shadow-rose-500/50"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                title={isListening ? "Stop Voice Search" : "Speak to Search (Voice AI)"}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Voice Search</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Voice Listening Feedback Banner */}
          {isListening && (
            <div className="mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-semibold animate-fadeIn">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span>
                {transcriptPreview ? `Hearing: "${transcriptPreview}"` : "Listening to microphone... Speak product or party name."}
              </span>
            </div>
          )}

          {/* Voice Error Banner */}
          {voiceError && !isListening && (
            <div className="mt-3 flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{voiceError}</span>
              </div>
              <button
                onClick={() => setVoiceError(null)}
                className="text-amber-300 hover:underline text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Top Category & Filters Toolbar */}
        <div className="lg:col-span-12 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: "all", label: "All Records", icon: Sparkles, count: totalResults },
                { id: "products", label: "Products & Stock", icon: Package, count: results.products.length },
                { id: "customers", label: "Parties & Customers", icon: Users, count: results.customers.length },
                { id: "vouchers", label: "Invoices & Vouchers", icon: FileText, count: results.vouchers.length },
                { id: "users", label: "Sales Team & MR", icon: UserCheck, count: results.users.length },
                { id: "navigation", label: "Navigation & KPIs", icon: Compass, count: results.navigation.length },
              ].map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      updateUrl(query, cat.id);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${isActive
                        ? "bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                    {query.trim() && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isActive ? "bg-indigo-800 text-indigo-100" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                      >
                        {cat.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Export Actions */}
            {flatResults.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-xs shrink-0 cursor-pointer"
                title="Export search results to CSV"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

          {/* Facets & Filter Bar */}
          {query.trim() && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  Filters:
                </span>

                <button
                  onClick={() => setInStockOnly((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${inStockOnly
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                >
                  {inStockOnly ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  <span>In Stock Only 📦</span>
                </button>

                <button
                  onClick={() => setNearExpiryOnly((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${nearExpiryOnly
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                >
                  {nearExpiryOnly ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  <span>Near Expiry (&lt;90 Days) ⏳</span>
                </button>

                <button
                  onClick={() => setHighBalanceOnly((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${highBalanceOnly
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                >
                  {highBalanceOnly ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  <span>Outstanding &gt; 0 💰</span>
                </button>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="stockHigh">Stock (High to Low)</option>
                  <option value="priceHigh">Price / Amount (High to Low)</option>
                  <option value="priceLow">Price / Amount (Low to High)</option>
                  <option value="name">Alphabetical (A to Z)</option>
                </select>
              </div>
            </div>
          )}

          {/* Typo Suggestion */}
          {didYouMean && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Did you mean:</span>
              <button
                onClick={() => setQuery(didYouMean)}
                className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
              >
                {didYouMean}
              </button>
            </div>
          )}
        </div>

        {/* Results Container */}
        <div className="lg:col-span-12 space-y-4">
          {/* No Query State: Show Live Dynamic Trending Searches */}
          {!query.trim() && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Live Database Trending & Suggested Searches
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold border border-indigo-100 dark:border-indigo-800">
                  Real MongoDB Data
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {dynamicTrending.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (item.actionUrl) {
                        router.push(item.actionUrl);
                      } else {
                        setQuery(item.query || item.label);
                      }
                    }}
                    className="flex flex-col justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-200 text-left transition-all group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                        {item.label}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 mt-0.5 block">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      <span>Search Record</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && query.trim() && flatResults.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Searching live MongoDB collections...</p>
            </div>
          )}

          {/* Empty Results State */}
          {!loading && query.trim() && flatResults.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No matching records found for &quot;{query}&quot;
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Try searching with partial names, customer codes, product codes, or turn off &quot;In Stock Only&quot; / &quot;Near Expiry&quot; filters.
              </p>
            </div>
          )}

          {/* Results Grid */}
          {flatResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Found {flatResults.length} {flatResults.length === 1 ? "Record" : "Records"}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  Click card to navigate • Click copy to export
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {flatResults.map((item) => {
                  const isCopied = copiedId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.actionUrl) {
                          router.push(item.actionUrl);
                        } else {
                          setSelectedItem(item);
                        }
                      }}
                      className="group bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer relative"
                    >
                      <div>
                        {/* Card Header: Icon & Category */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`p-2 rounded-xl shrink-0 ${item.type === "product"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : item.type === "customer"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                    : item.type === "voucher"
                                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                      : item.type === "user"
                                        ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                        : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                }`}
                            >
                              {item.type === "product" && <Package className="w-4 h-4" />}
                              {item.type === "customer" && <Users className="w-4 h-4" />}
                              {item.type === "voucher" && <FileText className="w-4 h-4" />}
                              {item.type === "user" && <UserCheck className="w-4 h-4" />}
                              {item.type === "kpi" && <TrendingUp className="w-4 h-4" />}
                              {item.type === "navigation" && <Compass className="w-4 h-4" />}
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                              {item.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyRecord(item);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Copy details to clipboard"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Inspect full details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title & Subtitle */}
                        <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.subtitle}
                        </p>
                      </div>

                      {/* Badges & Actions Footer */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(item.badges || []).map((b: any, idx: number) => (
                            <span
                              key={idx}
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${b.color === "emerald"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : b.color === "rose"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : b.color === "amber"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : b.color === "blue"
                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                        : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                            >
                              {b.label}
                            </span>
                          ))}
                        </div>

                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          <span>Open</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspect Item Modal Drawer */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    {selectedItem.category} Details
                  </span>
                  <h3 className="text-base font-bold text-white truncate">
                    {selectedItem.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 max-h-[70vh]">
              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                  Summary & Metrics
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(selectedItem.details || {}).map(([key, val]) => {
                    if (key === "batches") return null;
                    return (
                      <div
                        key={key}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-center"
                      >
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                          {String(val || "N/A")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Product Batches Table */}
              {selectedItem.type === "product" &&
                selectedItem.details?.batches &&
                selectedItem.details.batches.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Batch Inventory Breakdown ({selectedItem.details.batches.length})
                    </h4>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-2.5">Batch No</th>
                            <th className="p-2.5">Expiry</th>
                            <th className="p-2.5">Qty</th>
                            <th className="p-2.5">MRP</th>
                            <th className="p-2.5">Sale Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                          {selectedItem.details.batches.map((b: any, bIdx: number) => (
                            <tr key={bIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="p-2.5 font-bold text-indigo-600">{b.batchNo}</td>
                              <td className="p-2.5">{b.exp}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                  {b.qty}
                                </span>
                              </td>
                              <td className="p-2.5">{b.mrp}</td>
                              <td className="p-2.5">{b.rate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => copyRecord(selectedItem)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                {copiedId === selectedItem.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === selectedItem.id ? "Copied!" : "Copy Record Data"}</span>
              </button>

              {selectedItem.actionUrl && (
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    router.push(selectedItem.actionUrl);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <span>Open Target Page</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
