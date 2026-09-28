"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaSlidersH,
  FaPlus,
  FaSearch,
  FaPaperPlane,
  FaTable,
  FaEdit,
  FaTrash,
  FaChartBar,
  FaFileAlt,
  FaLayerGroup,
  FaShareAlt,
  FaTh,
  FaList,
  FaCheckCircle,
  FaGlobe,
  FaLock,
  FaKey,
  FaClipboardList,
  FaBolt,
  FaInbox,
  FaCalendarCheck,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import FormShareModal from "@/components/custom-forms/FormShareModal";

interface HubStats {
  totalForms: number;
  activeForms: number;
  draftForms: number;
  totalSubmissions: number;
}

export default function CustomFormsHubPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareForm, setShareForm] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"updatedAt" | "title" | "fields">("updatedAt");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [stats, setStats] = useState<HubStats>({
    totalForms: 0,
    activeForms: 0,
    draftForms: 0,
    totalSubmissions: 0,
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/custom-forms/templates");
      const data = await res.json();
      if (data.success) {
        const tmpl = data.templates || [];
        setTemplates(tmpl);
        setStats({
          totalForms: tmpl.length,
          activeForms: tmpl.filter((t: any) => t.status === "Active").length,
          draftForms: tmpl.filter((t: any) => t.status === "Draft").length,
          totalSubmissions: tmpl.reduce(
            (acc: number, t: any) => acc + (t.submissionCount || 0),
            0
          ),
        });
      }
    } catch (err) {
      console.error("Error fetching form templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string, title: string) => {
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/custom-forms/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) => prev.filter((t) => t._id !== id && t.formId !== id));
      } else {
        alert(data.error || "Failed to delete form.");
      }
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/custom-forms/templates/${id}`, { method: "DELETE" })
        )
      );
      setTemplates((prev) =>
        prev.filter((t) => !selectedIds.includes(t._id) && !selectedIds.includes(t.formId))
      );
      setSelectedIds([]);
    } catch (err) {
      console.error("Bulk delete error:", err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category || "General")))];

  const filteredTemplates = templates
    .filter((t) => {
      const matchesSearch =
        !search ||
        t.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.formId?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || (t.category || "General") === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "fields") return (b.fields?.length || 0) - (a.fields?.length || 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const accessIcon = (mode: string) => {
    if (mode === "Public") return <FaGlobe className="text-emerald-500" title="Public" />;
    if (mode === "PasswordProtected") return <FaKey className="text-amber-500" title="PIN Protected" />;
    return <FaLock className="text-slate-400" title="Internal Only" />;
  };

  const statusColor = (status: string) => {
    if (status === "Active") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    if (status === "Draft") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400";
  };

  const relativeTime = (dateStr: string) => {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── PAGE HEADER ── */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 rounded-2xl shadow-lg text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-3">
            <span className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
              <FaSlidersH className="text-xl" />
            </span>
            Custom Form Studio
            <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
              Enterprise
            </span>
          </h1>
          <p className="text-sm text-indigo-100 mt-1.5 max-w-lg">
            Design dynamic forms, configure IF/THEN rules, share public QR links, and analyze visual KPIs.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboard/custom-forms/guide"
            className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white font-medium text-sm rounded-xl backdrop-blur-sm transition-all flex items-center gap-2"
          >
            <FaClipboardList /> Guide
          </Link>
          <Link
            href="/dashboard/custom-forms/builder"
            className="px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <FaPlus /> Create New Form
          </Link>
        </div>
      </div>

      {/* ── STATS BANNER ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Forms",
            value: stats.totalForms,
            icon: <FaLayerGroup />,
            color: "bg-indigo-500",
            bg: "bg-indigo-50 dark:bg-indigo-900/20",
            text: "text-indigo-700 dark:text-indigo-300",
          },
          {
            label: "Active Forms",
            value: stats.activeForms,
            icon: <FaCheckCircle />,
            color: "bg-emerald-500",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
            text: "text-emerald-700 dark:text-emerald-300",
          },
          {
            label: "Draft Forms",
            value: stats.draftForms,
            icon: <FaFileAlt />,
            color: "bg-amber-500",
            bg: "bg-amber-50 dark:bg-amber-900/20",
            text: "text-amber-700 dark:text-amber-300",
          },
          {
            label: "Total Submissions",
            value: stats.totalSubmissions,
            icon: <FaInbox />,
            color: "bg-violet-500",
            bg: "bg-violet-50 dark:bg-violet-900/20",
            text: "text-violet-700 dark:text-violet-300",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`${s.bg} p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4`}
          >
            <div className={`w-11 h-11 ${s.color} bg-opacity-100 rounded-xl flex items-center justify-center text-white text-lg shadow-sm flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                {loading ? "—" : s.value}
              </p>
              <p className={`text-xs font-semibold ${s.text}`}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTER & TOOLBAR ── */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search forms..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <FaSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="updatedAt">Sort: Recent</option>
            <option value="title">Sort: A–Z</option>
            <option value="fields">Sort: Fields</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white dark:bg-slate-600 shadow-sm text-indigo-600" : "text-slate-500"}`}
            >
              <FaTh className="text-sm" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-600 shadow-sm text-indigo-600" : "text-slate-500"}`}
            >
              <FaList className="text-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* ── BULK DELETE BAR ── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-2xl px-5 py-3 text-sm">
          <span className="text-rose-700 dark:text-rose-300 font-semibold">
            {selectedIds.length} form{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-600 dark:text-slate-300"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <FaTrash /> {bulkDeleting ? "Deleting..." : `Delete ${selectedIds.length} Forms`}
            </button>
          </div>
        </div>
      )}

      {/* ── TEMPLATES ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/5" />
              <div className="grid grid-cols-4 gap-2 pt-2">
                {[1,2,3,4].map(j => <div key={j} className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 mx-auto mb-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
            <FaFileAlt className="text-3xl text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No Custom Forms Found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {search ? `No forms match "${search}". Try a different search.` : "Click below to design your first custom form."}
          </p>
          {!search && (
            <Link
              href="/dashboard/custom-forms/builder"
              className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
            >
              <FaPlus /> Build Your First Form
            </Link>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => (
            <div
              key={template._id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all shadow-sm hover:shadow-lg flex flex-col justify-between space-y-4 overflow-hidden group ${
                selectedIds.includes(template._id)
                  ? "border-indigo-400 ring-2 ring-indigo-300 dark:ring-indigo-700"
                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800"
              }`}
            >
              {/* Accent top bar */}
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: template.theme?.accentColor || "#4f46e5" }}
              />

              <div className="px-5 pt-2 pb-1 space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(template._id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        selectedIds.includes(template._id)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                      }`}
                    >
                      {selectedIds.includes(template._id) && <FaCheck className="text-[9px]" />}
                    </button>
                    <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {template.category || "General"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {accessIcon(template.accessMode)}
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColor(template.status)}`}>
                      {template.status || "Active"}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {template.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">
                  {template.description || "No description provided."}
                </p>

                {/* Meta chips */}
                <div className="flex items-center flex-wrap gap-2 pt-1 pb-2 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <FaLayerGroup className="text-indigo-400 text-[10px]" />
                    {template.fields?.length || 0} fields
                  </span>
                  {template.conditions?.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium">
                      <FaBolt className="text-[10px]" />
                      {template.conditions.length} rules
                    </span>
                  )}
                  {template.approvalWorkflow?.enabled && (
                    <span className="text-[10px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 px-2 py-0.5 rounded-full">
                      ✅ Approval
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <FaCalendarCheck className="text-[9px]" />
                    {relativeTime(template.updatedAt)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-5 pb-5 grid grid-cols-4 gap-2 text-xs">
                <Link
                  href={`/dashboard/custom-forms/entry/${template.formId}`}
                  className="py-2 px-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-center shadow-sm flex items-center justify-center gap-1 transition-all"
                >
                  <FaPaperPlane className="text-[10px]" /> Fill
                </Link>

                <button
                  onClick={() => { setShareForm(template); setShareModalOpen(true); }}
                  className="py-2 px-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100 font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
                >
                  <FaShareAlt className="text-[10px]" /> Share
                </button>

                <Link
                  href={`/dashboard/custom-forms/views/${template.formId}`}
                  className="py-2 px-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
                >
                  <FaTable className="text-[10px] text-indigo-500" /> Data
                </Link>

                <Link
                  href={`/dashboard/custom-forms/analytics/${template.formId}`}
                  className="py-2 px-1.5 bg-violet-50 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
                >
                  <FaChartBar className="text-[10px]" /> Stats
                </Link>

                <Link
                  href={`/dashboard/custom-forms/builder/${template.formId}`}
                  className="col-span-3 py-1.5 px-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 hover:text-indigo-700 font-medium rounded-lg flex items-center justify-center gap-1 transition-all"
                >
                  <FaEdit className="text-xs" /> Edit Design & Logic
                </Link>

                {confirmDeleteId === template._id ? (
                  <div className="col-span-1 flex gap-1">
                    <button
                      onClick={() => handleDeleteTemplate(template._id, template.title)}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center justify-center transition-all"
                      title="Confirm Delete"
                    >
                      <FaCheck className="text-[10px]" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg flex items-center justify-center transition-all"
                      title="Cancel"
                    >
                      <FaTimes className="text-[10px]" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(template._id)}
                    className="col-span-1 py-1.5 px-3 border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium rounded-lg flex items-center justify-center gap-1 transition-all"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
            <div className="col-span-1" />
            <div className="col-span-4">Form Title</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Fields</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Access</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {filteredTemplates.map((template, idx) => (
            <div
              key={template._id}
              className={`grid grid-cols-12 px-5 py-4 items-center text-sm transition-all hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 ${
                idx !== filteredTemplates.length - 1 ? "border-b border-slate-100 dark:border-slate-700/60" : ""
              } ${selectedIds.includes(template._id) ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
            >
              <div className="col-span-1">
                <button
                  onClick={() => toggleSelect(template._id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedIds.includes(template._id)
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                  }`}
                >
                  {selectedIds.includes(template._id) && <FaCheck className="text-[9px]" />}
                </button>
              </div>
              <div className="col-span-4">
                <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{template.title}</p>
                <p className="text-xs text-slate-400 font-mono truncate">{template.formId}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {template.category || "General"}
                </span>
              </div>
              <div className="col-span-1 text-slate-600 dark:text-slate-400 font-mono text-xs">
                {template.fields?.length || 0}
              </div>
              <div className="col-span-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(template.status)}`}>
                  {template.status}
                </span>
              </div>
              <div className="col-span-1">
                {accessIcon(template.accessMode)}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <Link
                  href={`/dashboard/custom-forms/entry/${template.formId}`}
                  className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 transition-all"
                  title="Fill Form"
                >
                  <FaPaperPlane className="text-xs" />
                </Link>
                <Link
                  href={`/dashboard/custom-forms/views/${template.formId}`}
                  className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-all"
                  title="View Data"
                >
                  <FaTable className="text-xs" />
                </Link>
                <Link
                  href={`/dashboard/custom-forms/builder/${template.formId}`}
                  className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-all"
                  title="Edit"
                >
                  <FaEdit className="text-xs" />
                </Link>
                <button
                  onClick={() => setConfirmDeleteId(confirmDeleteId === template._id ? null : template._id)}
                  className="p-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-lg hover:bg-rose-100 transition-all"
                  title="Delete"
                >
                  <FaTrash className="text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm Toast */}
      {confirmDeleteId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 min-w-[340px]">
          <FaTrash className="text-rose-400 text-lg flex-shrink-0" />
          <span className="text-sm font-medium flex-1">
            Delete <span className="font-bold text-rose-300">&quot;{templates.find(t => t._id === confirmDeleteId)?.title}&quot;</span>? This cannot be undone.
          </span>
          <button
            onClick={() => handleDeleteTemplate(confirmDeleteId, "")}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-all"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-all"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Share & QR Code Modal */}
      <FormShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        formTemplate={shareForm}
      />
    </div>
  );
}
