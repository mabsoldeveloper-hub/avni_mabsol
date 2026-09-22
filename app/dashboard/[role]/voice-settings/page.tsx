"use client";

import React, { useState, useEffect } from "react";
import { Mic, Volume2, Save, Sparkles, Check, Radio, RotateCcw, VolumeX, ShieldCheck } from "lucide-react";

export default function VoiceSettingsPage() {
  const [assistantName, setAssistantName] = useState("AI Assistant");
  const [wakewordEnabled, setWakewordEnabled] = useState(false);
  const [greetingText, setGreetingText] = useState("Haan ji! Main aapki kya help kar sakta hu?");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [micStatusMsg, setMicStatusMsg] = useState<string | null>(null);

  // Load initial voice AI settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mabsol_voice_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.assistantName) setAssistantName(parsed.assistantName);
        if (typeof parsed.wakewordEnabled === "boolean") setWakewordEnabled(parsed.wakewordEnabled);
        else setWakewordEnabled(false);
        if (parsed.greetingText) setGreetingText(parsed.greetingText);
      } else {
        setWakewordEnabled(false);
      }
    } catch (e) {
      console.error("Failed to load voice AI settings:", e);
      setWakewordEnabled(false);
    }
  }, []);

  // Helper to request Mic permission when enabled
  const requestMicPermission = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
    try {
      setMicStatusMsg("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatusMsg("Microphone permission granted! Voice Assistant is ready.");
      setTimeout(() => setMicStatusMsg(null), 4000);
      return true;
    } catch (err: any) {
      console.warn("Mic permission denied:", err);
      setMicStatusMsg("Microphone permission was denied by browser.");
      setTimeout(() => setMicStatusMsg(null), 5000);
      return false;
    }
  };

  const handleToggleWakeword = async () => {
    const nextVal = !wakewordEnabled;
    setWakewordEnabled(nextVal);
    if (nextVal) {
      await requestMicPermission();
    }
  };

  // Save voice settings to localStorage & notify Topbar/GlobalSearchModal
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const nameToSave = assistantName.trim() || "AI Assistant";
    const greetingToSave = greetingText.trim() || "Haan ji! Main aapki kya help kar sakta hu?";

    if (wakewordEnabled) {
      await requestMicPermission();
    }

    const settingsData = {
      assistantName: nameToSave,
      wakewordEnabled: wakewordEnabled,
      greetingText: greetingToSave,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("mabsol_voice_settings", JSON.stringify(settingsData));
      window.dispatchEvent(new Event("mabsol_voice_settings_updated"));

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
    }
  };

  // Reset to default settings
  const handleReset = () => {
    setAssistantName("AI Assistant");
    setWakewordEnabled(false);
    setGreetingText("Haan ji! Main aapki kya help kar sakta hu?");
  };

  // Test Assistant Voice Response Live
  const handleTestVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      setTestingVoice(true);

      const message = `${greetingText || "Haan ji! Main aapki kya help kar sakta hu?"} Main ${assistantName || "AI Assistant"} Voice AI Assistant hu.`;
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = "en-IN";

      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find((v) => v.lang.toLowerCase().includes("en-in") || v.lang.toLowerCase().includes("hi-in")) || voices[0];
      if (indianVoice) utterance.voice = indianVoice;

      utterance.onend = () => setTestingVoice(false);
      utterance.onerror = () => setTestingVoice(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Voice test failed:", e);
      setTestingVoice(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 p-6 sm:p-8 text-white shadow-2xl border border-indigo-800/60">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-wider border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                AI Voice Settings
              </span>
              {wakewordEnabled ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  &quot;Hey {assistantName}&quot; Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-400/30 flex items-center gap-1">
                  <VolumeX className="w-3.5 h-3.5" />
                  Wake-Word Disabled
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Voice Assistant Configuration
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 font-medium max-w-xl leading-relaxed">
              Customize your dynamic AI Assistant name (e.g. AI Assistant, CRM AI, Jarvis, Alexa, Siri) and control background &quot;Hey {assistantName}&quot; wake-word voice activation across the CRM.
            </p>
          </div>

          <button
            onClick={handleTestVoice}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg transition-all transform hover:scale-105 cursor-pointer shrink-0 ${
              testingVoice
                ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white animate-pulse"
                : "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white"
            }`}
          >
            {testingVoice ? <Volume2 className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
            <span>{testingVoice ? "Assistant Speaking..." : `Test ${assistantName || "AI Assistant"} Voice 🔊`}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {savedSuccess && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-md animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-emerald-950">Settings Saved Successfully!</h4>
              <p className="text-xs font-medium text-emerald-800">
                Voice Assistant name updated to <strong>&quot;{assistantName}&quot;</strong> and wake-word status synced across all dashboard pages.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Form Card */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
        {/* Section 1: Assistant Name Input */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Assistant Name (Dynamic)
              </label>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Enter any custom name for your voice assistant. Users can wake it up by saying &quot;Hey [Name]&quot;.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Current: &quot;{assistantName || "AI Assistant"}&quot;
            </span>
          </div>

          <div className="relative max-w-md">
            <input
              type="text"
              value={assistantName}
              onChange={(e) => setAssistantName(e.target.value)}
              placeholder="e.g. AI Assistant, CRM AI, Jarvis, Alexa, Siri"
              required
              className="w-full pl-4 pr-10 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-2xl outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Mic className="w-4 h-4 text-indigo-500" />
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs font-bold text-slate-400">Quick Presets:</span>
            {["AI Assistant", "CRM AI", "Jarvis", "Alexa", "Siri"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAssistantName(preset)}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  assistantName.toLowerCase() === preset.toLowerCase()
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Wake-Word Toggle Switch */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-500" />
                &quot;Hey {assistantName || "AI Assistant"}&quot; Wake-Word Background Listener
              </label>
              <p className="text-xs text-slate-500 font-medium max-w-lg leading-relaxed">
                When enabled, your browser will listen in the background on every dashboard page for <strong>&quot;Hey {assistantName || "AI Assistant"}&quot;</strong> and automatically open voice search. Disable to turn off background mic.
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleWakeword}
              className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                wakewordEnabled ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
                  wakewordEnabled ? "translate-x-8" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {micStatusMsg && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-900 flex items-center gap-2 animate-fadeIn">
              <Mic className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>{micStatusMsg}</span>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Background Wake-Word Status:</span>
            </span>
            <span className={`font-black px-2.5 py-0.5 rounded-md ${
              wakewordEnabled ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}>
              {wakewordEnabled ? "ENABLED (Listening for 'Hey " + (assistantName || "AI Assistant") + "')" : "DISABLED (Background Mic Off)"}
            </span>
          </div>
        </div>

        {/* Section 3: Vocal Greeting Customization */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <div>
            <label className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-600" />
              Vocal Greeting Message
            </label>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              The sentence spoken out loud by the voice assistant when activated by wake-word or clicking the mic.
            </p>
          </div>

          <input
            type="text"
            value={greetingText}
            onChange={(e) => setGreetingText(e.target.value)}
            placeholder="e.g. Haan ji! Main aapki kya help kar sakta hu?"
            required
            className="w-full px-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-2xl outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
          />

          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-medium">
            <span>Examples:</span>
            {[
              "Haan ji! Main aapki kya help kar sakta hu?",
              `Hello! Main ${assistantName || "AI Assistant"} hu, aapki kya help kar sakta hu?`,
              "May I help you with sales, stock or vouchers?",
            ].map((msg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setGreetingText(msg)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 cursor-pointer"
              >
                &quot;{msg}&quot;
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Default</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-105 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Voice Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
