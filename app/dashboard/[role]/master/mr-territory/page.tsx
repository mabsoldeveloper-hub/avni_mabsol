"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaUserTie,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaArrowRight,
  FaUndo,
  FaSave,
  FaBuilding,
  FaSitemap,
  FaNetworkWired,
  FaTag,
  FaFilter,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaTimes,
  FaSync,
  FaChevronDown,
  FaChevronRight,
  FaMapMarkerAlt,
  FaChartBar,
} from "react-icons/fa";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface UserItem {
  _id: string;
  name: string;
  email: string;
  employeeCode?: string;
  mobile?: string;
  designation?: string;
  roleId?: { _id: string; roleName: string } | string;
}

interface CompanyItem { _id: string; companyCode: string; companyName: string; }
interface DivisionItem { _id: string; companyCode: string; divisionCode: string; divisionName: string; }
interface SubDivisionItem { _id: string; companyCode: string; divisionCode: string; subDivisionCode: string; subDivisionName: string; }
interface CategoryItem { _id: string; companyCode: string; divisionCode: string; subDivisionCode: string; categoryCode: string; categoryName: string; }

interface TerritoryItem {
  _id: string;
  userId: string | { _id: string; name: string; email: string; employeeCode?: string; };
  userName: string;
  employeeCode: string;
  companyCode: string;
  companyName: string;
  divisionCode: string;
  divisionName: string;
  subDivisionCode: string;
  subDivisionName: string;
  categoryCode: string;
  categoryName: string;
  notes: string;
  status: "Active" | "Inactive";
  createdAt?: string;
}

interface FormData {
  userId: string;
  companyCode: string;
  companyName: string;
  divisionCode: string;
  divisionName: string;
  subDivisionCode: string;
  subDivisionName: string;
  categoryCode: string;
  categoryName: string;
  notes: string;
  status: "Active" | "Inactive";
}

const initialFormState: FormData = {
  userId: "", companyCode: "", companyName: "",
  divisionCode: "", divisionName: "",
  subDivisionCode: "", subDivisionName: "",
  categoryCode: "", categoryName: "",
  notes: "", status: "Active",
};

// Group territories by MR
function groupByMr(items: TerritoryItem[]) {
  const map = new Map<string, { user: TerritoryItem; items: TerritoryItem[] }>();
  items.forEach((t) => {
    const uid = typeof t.userId === "string" ? t.userId : t.userId?._id || t.userName;
    if (!map.has(uid)) {
      map.set(uid, { user: t, items: [] });
    }
    map.get(uid)!.items.push(t);
  });
  return Array.from(map.values());
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function MrTerritoryPage() {
  // Master data
  const [territories, setTerritories] = useState<TerritoryItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [subDivisions, setSubDivisions] = useState<SubDivisionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewState, setViewState] = useState<"list" | "add" | "edit">("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedMrs, setExpandedMrs] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Form
  const [formData, setFormData] = useState<FormData>(initialFormState);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<TerritoryItem | null>(null);

  // ── Initial Load ─────────────────────────────────────────
  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    await Promise.all([
      fetchUsers(), fetchCompanies(), fetchDivisions(),
      fetchSubDivisions(), fetchCategories(), fetchTerritories(),
    ]);
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success || Array.isArray(json)) {
        const rawList = Array.isArray(json) ? json : json.data || json.users || [];
        // Filter out Admin role users (territories are for MR / Salesman roles only)
        const nonAdminUsers = rawList.filter((u: any) => {
          const rName = typeof u.roleId === "object" ? u.roleId?.roleName : "";
          return !String(rName || "").toLowerCase().includes("admin");
        });
        setUsers(nonAdminUsers);
      }
    } catch (e) { console.error("users", e); }
  }


  async function fetchCompanies() {
    try {
      const res = await fetch("/api/master/fetch-company-master");
      const json = await res.json();
      if (json.success) setCompanies(json.data || []);
    } catch (e) { console.error("companies", e); }
  }

  async function fetchDivisions() {
    try {
      const res = await fetch("/api/division-master");
      const json = await res.json();
      if (json.success) setDivisions(json.data || []);
    } catch (e) { console.error("divisions", e); }
  }

  async function fetchSubDivisions() {
    try {
      const res = await fetch("/api/sub-division-master");
      const json = await res.json();
      if (json.success) setSubDivisions(json.data || []);
    } catch (e) { console.error("subdiv", e); }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/category-master");
      const json = await res.json();
      if (json.success) setCategories(json.data || []);
    } catch (e) { console.error("categories", e); }
  }

  async function fetchTerritories() {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      if (search) p.append("search", search);
      if (companyFilter) p.append("companyCode", companyFilter);
      if (statusFilter) p.append("status", statusFilter);

      const res = await fetch(`/api/mr-territory?${p.toString()}`);
      const json = await res.json();
      if (json.success) setTerritories(json.data || []);
      else setError(json.message || "Failed to load territories");
    } catch (e) { setError("Error loading territories"); }
    finally { setLoading(false); }
  }

  // ── Cascading Dropdowns for Form ─────────────────────────
  const formDivisions = useMemo(
    () => formData.companyCode ? divisions.filter(d => d.companyCode === formData.companyCode) : [],
    [divisions, formData.companyCode]
  );
  const formSubDivisions = useMemo(
    () => (formData.companyCode && formData.divisionCode)
      ? subDivisions.filter(s => s.companyCode === formData.companyCode && s.divisionCode === formData.divisionCode)
      : [],
    [subDivisions, formData.companyCode, formData.divisionCode]
  );
  const formCategories = useMemo(
    () => (formData.companyCode && formData.divisionCode)
      ? categories.filter(c =>
          c.companyCode === formData.companyCode &&
          c.divisionCode === formData.divisionCode &&
          (!formData.subDivisionCode || c.subDivisionCode === formData.subDivisionCode)
        )
      : [],
    [categories, formData.companyCode, formData.divisionCode, formData.subDivisionCode]
  );

  // ── Filter Dropdowns ─────────────────────────────────────
  const filterDivisions = useMemo(
    () => companyFilter ? divisions.filter(d => d.companyCode === companyFilter) : divisions,
    [divisions, companyFilter]
  );

  // ── Filtered + Grouped ───────────────────────────────────
  const filtered = useMemo(() => {
    return territories.filter(t => {
      const s = search.toLowerCase();
      const matchSearch = !search ||
        t.userName.toLowerCase().includes(s) ||
        (t.employeeCode && t.employeeCode.toLowerCase().includes(s)) ||
        t.companyName.toLowerCase().includes(s) ||
        t.divisionName.toLowerCase().includes(s) ||
        t.subDivisionName.toLowerCase().includes(s) ||
        t.categoryName.toLowerCase().includes(s);
      const matchCompany = !companyFilter || t.companyCode === companyFilter;
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchCompany && matchStatus;
    });
  }, [territories, search, companyFilter, statusFilter]);

  const grouped = useMemo(() => groupByMr(filtered), [filtered]);

  // ── Metrics ──────────────────────────────────────────────
  const metrics = useMemo(() => ({
    totalTerritories: territories.length,
    activeTerritories: territories.filter(t => t.status === "Active").length,
    totalMrs: new Set(territories.map(t => t.userName)).size,
  }), [territories]);

  // ── Toggle MR Expand ────────────────────────────────────
  const toggleExpand = (key: string) => {
    setExpandedMrs(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  // ── Form Handlers ────────────────────────────────────────
  const handleOpenAdd = () => {
    setFormData(initialFormState); setFormErrors({});
    setError(null); setSuccess(null); setEditId(null); setViewState("add");
  };

  const handleOpenEdit = (item: TerritoryItem) => {
    setFormData({
      userId: typeof item.userId === "string" ? item.userId : item.userId?._id || "",
      companyCode: item.companyCode, companyName: item.companyName,
      divisionCode: item.divisionCode, divisionName: item.divisionName,
      subDivisionCode: item.subDivisionCode || "", subDivisionName: item.subDivisionName || "",
      categoryCode: item.categoryCode || "", categoryName: item.categoryName || "",
      notes: item.notes || "", status: item.status,
    });
    setFormErrors({}); setError(null); setSuccess(null);
    setEditId(item._id); setViewState("edit");
  };

  const setField = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    setFormData(p => ({ ...p, [key]: val }));
    setFormErrors(p => ({ ...p, [key]: undefined }));
  };

  const handleCompanyChange = (code: string) => {
    const c = companies.find(x => x.companyCode === code);
    setFormData(p => ({
      ...p, companyCode: code, companyName: c?.companyName || "",
      divisionCode: "", divisionName: "",
      subDivisionCode: "", subDivisionName: "",
      categoryCode: "", categoryName: "",
    }));
    setFormErrors(p => ({ ...p, companyCode: undefined }));
  };

  const handleDivisionChange = (code: string) => {
    const d = formDivisions.find(x => x.divisionCode === code);
    setFormData(p => ({
      ...p, divisionCode: code, divisionName: d?.divisionName || "",
      subDivisionCode: "", subDivisionName: "",
      categoryCode: "", categoryName: "",
    }));
    setFormErrors(p => ({ ...p, divisionCode: undefined }));
  };

  const handleSubDivChange = (code: string) => {
    const s = formSubDivisions.find(x => x.subDivisionCode === code);
    setFormData(p => ({
      ...p, subDivisionCode: code, subDivisionName: s?.subDivisionName || "",
      categoryCode: "", categoryName: "",
    }));
  };

  const handleCategoryChange = (code: string) => {
    const c = formCategories.find(x => x.categoryCode === code);
    setFormData(p => ({ ...p, categoryCode: code, categoryName: c?.categoryName || "" }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!formData.userId) errs.userId = "MR is required";
    if (!formData.companyCode) errs.companyCode = "Company is required";
    if (!formData.divisionCode) errs.divisionCode = "Division is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const url = editId ? `/api/mr-territory/${editId}` : "/api/mr-territory";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(json.message || "Territory saved successfully!");
        await fetchTerritories();
        setTimeout(() => { setViewState("list"); setSuccess(null); }, 1200);
      } else {
        setError(json.message || "Failed to save territory.");
      }
    } catch { setError("Unexpected error while saving."); }
    finally { setSaving(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget._id); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/mr-territory/${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setSuccess("Territory assignment removed.");
        await fetchTerritories();
      } else setError(json.message || "Failed to delete.");
    } catch { setError("Error deleting territory."); }
    finally { setDeletingId(null); setDeleteTarget(null); }
  };

  // Scope display helper
  const scopeLabel = (item: TerritoryItem) => {
    const parts = [item.divisionName];
    if (item.subDivisionName) parts.push(item.subDivisionName);
    if (item.categoryName) parts.push(item.categoryName);
    return parts.join(" → ");
  };

  const scopeBadge = (item: TerritoryItem) => {
    if (item.categoryCode) return { label: "Category", color: "bg-purple-100 text-purple-700" };
    if (item.subDivisionCode) return { label: "Sub Division", color: "bg-indigo-100 text-indigo-700" };
    return { label: "Division", color: "bg-blue-100 text-blue-700" };
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header Banner ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 p-5 rounded-2xl text-white shadow-xl border border-teal-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400">
            <FaMapMarkerAlt className="text-2xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                Territory Management
              </span>
              <span className="text-xs text-slate-300">MR Product Scope</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
              MR Territory Assignment
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Assign Company → Division → Category scope to each MR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboard/master"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/20 transition-all"
          >
            <FaArrowLeft /> Back to Masters
          </Link>
          <Link
            href="/dashboard/reports/mr-territory-report"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-500/30 transition-all"
          >
            <FaChartBar /> MR Report
          </Link>
          {viewState === "list" && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <FaPlus /> Add Assignment
            </button>
          )}
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-rose-500 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)}><FaTimes className="text-rose-400" /></button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)}><FaTimes className="text-emerald-400" /></button>
        </div>
      )}

      {/* ── ADD / EDIT FORM ───────────────────────────────── */}
      {(viewState === "add" || viewState === "edit") && (
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {viewState === "add" ? "New Territory Assignment" : "Edit Territory Assignment"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign a Company + Division (+ optional Sub Division / Category) to an MR
              </p>
            </div>
            <button onClick={() => setViewState("list")} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition">
              <FaArrowLeft /> Back to List
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* MR (User) * */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  MR / Salesman <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.userId}
                  onChange={e => setField("userId", e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${formErrors.userId ? "border-rose-400 bg-rose-50/30" : "border-slate-300"}`}
                >
                  <option value="">-- Select MR / Salesman --</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name}{u.employeeCode ? ` (${u.employeeCode})` : ""}{u.designation ? ` — ${u.designation}` : ""}
                    </option>
                  ))}
                </select>
                {formErrors.userId && <p className="text-xs text-rose-500">{formErrors.userId}</p>}
              </div>

              {/* Company * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Company <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.companyCode}
                  onChange={e => handleCompanyChange(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${formErrors.companyCode ? "border-rose-400 bg-rose-50/30" : "border-slate-300"}`}
                >
                  <option value="">-- Select Company --</option>
                  {companies.map(c => (
                    <option key={c._id} value={c.companyCode}>{c.companyName} ({c.companyCode})</option>
                  ))}
                </select>
                {formErrors.companyCode && <p className="text-xs text-rose-500">{formErrors.companyCode}</p>}
              </div>

              {/* Division * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Division <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.divisionCode}
                  disabled={!formData.companyCode}
                  onChange={e => handleDivisionChange(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${formErrors.divisionCode ? "border-rose-400 bg-rose-50/30" : "border-slate-300"} ${!formData.companyCode ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="">{!formData.companyCode ? "Select Company First" : "-- Select Division --"}</option>
                  {formDivisions.map(d => (
                    <option key={d._id} value={d.divisionCode}>{d.divisionName} ({d.divisionCode})</option>
                  ))}
                </select>
                {formErrors.divisionCode && <p className="text-xs text-rose-500">{formErrors.divisionCode}</p>}
              </div>

              {/* Sub Division (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Sub Division <span className="text-slate-400 font-normal normal-case">(optional — blank = all)</span>
                </label>
                <select
                  value={formData.subDivisionCode}
                  disabled={!formData.divisionCode}
                  onChange={e => handleSubDivChange(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${!formData.divisionCode ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="">{!formData.divisionCode ? "Select Division First" : "All Sub Divisions"}</option>
                  {formSubDivisions.map(s => (
                    <option key={s._id} value={s.subDivisionCode}>{s.subDivisionName} ({s.subDivisionCode})</option>
                  ))}
                </select>
              </div>

              {/* Category (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Category <span className="text-slate-400 font-normal normal-case">(optional — blank = all)</span>
                </label>
                <select
                  value={formData.categoryCode}
                  disabled={!formData.divisionCode}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all ${!formData.divisionCode ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="">{!formData.divisionCode ? "Select Division First" : "All Categories"}</option>
                  {formCategories.map(c => (
                    <option key={c._id} value={c.categoryCode}>{c.categoryName} ({c.categoryCode})</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setField("status", e.target.value as "Active" | "Inactive")}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Notes */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes about this assignment..."
                  value={formData.notes}
                  onChange={e => setField("notes", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>
            </div>

            {/* Scope Preview */}
            {formData.divisionCode && (
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">Territory Scope Preview</p>
                <div className="flex flex-wrap gap-2 items-center text-sm text-teal-800">
                  <span className="font-semibold">{formData.companyName}</span>
                  <FaChevronRight className="text-teal-400 text-xs" />
                  <span className="font-semibold">{formData.divisionName}</span>
                  {formData.subDivisionName && (
                    <>
                      <FaChevronRight className="text-teal-400 text-xs" />
                      <span>{formData.subDivisionName}</span>
                    </>
                  )}
                  {formData.categoryName && (
                    <>
                      <FaChevronRight className="text-teal-400 text-xs" />
                      <span>{formData.categoryName}</span>
                    </>
                  )}
                  {!formData.subDivisionCode && !formData.categoryCode && (
                    <span className="text-xs text-teal-600 ml-2">(All sub divisions & categories)</span>
                  )}
                  {formData.subDivisionCode && !formData.categoryCode && (
                    <span className="text-xs text-teal-600 ml-2">(All categories in this sub division)</span>
                  )}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setViewState("list")} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5">
                <FaArrowLeft /> Back
              </button>
              <button type="button" onClick={() => { setFormData(editId ? formData : initialFormState); setFormErrors({}); }} className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-1.5">
                <FaUndo /> Reset
              </button>
              <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-xl shadow-lg shadow-teal-500/25 transition-all flex items-center gap-2 disabled:opacity-50">
                <FaSave /> {saving ? "Saving..." : editId ? "Update Assignment" : "Save Assignment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────── */}
      {viewState === "list" && (
        <div className="space-y-6">

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Assignments</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{metrics.totalTerritories}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl">
                <FaMapMarkerAlt />
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Assignments</p>
                <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics.activeTerritories}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                <FaCheckCircle />
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">MRs with Territory</p>
                <h3 className="text-3xl font-extrabold text-indigo-600 mt-1">{metrics.totalMrs}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                <FaUserTie />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search MR name, company, division..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><FaTimes /></button>}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <FaBuilding className="text-slate-400 text-xs" />
                <select
                  value={companyFilter}
                  onChange={e => setCompanyFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition"
                >
                  <option value="">All Companies</option>
                  {companies.map(c => <option key={c._id} value={c.companyCode}>{c.companyName}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <FaFilter className="text-slate-400 text-xs" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <button onClick={fetchTerritories} className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition" title="Refresh">
                <FaSync className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Grouped MR Cards */}
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
              <FaSync className="animate-spin text-3xl text-teal-500" />
              <span>Loading territory assignments...</span>
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <FaMapMarkerAlt className="text-4xl text-slate-300" />
              <span className="font-semibold text-slate-600">No Territory Assignments Found</span>
              <p className="text-xs text-slate-400">Click &quot;Add Assignment&quot; to assign a territory to an MR.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map(({ user, items }) => {
                const key = user.userName + user.companyCode;
                const isExpanded = expandedMrs.has(key);
                const activeCount = items.filter(i => i.status === "Active").length;

                return (
                  <div key={key} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    {/* MR Row Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/80 transition"
                      onClick={() => toggleExpand(key)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                          {user.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-2">
                            {user.userName}
                            {user.employeeCode && (
                              <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{user.employeeCode}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1">
                              <FaMapMarkerAlt className="text-teal-500" />
                              {items.length} territories
                            </span>
                            <span className="flex items-center gap-1">
                              <FaCheckCircle className="text-emerald-500" />
                              {activeCount} active
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Unique companies badges */}
                        <div className="hidden sm:flex items-center gap-1 flex-wrap">
                          {Array.from(new Set(items.map(i => i.companyName))).slice(0, 2).map(cn => (
                            <span key={cn} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                              {cn}
                            </span>
                          ))}
                          {new Set(items.map(i => i.companyName)).size > 2 && (
                            <span className="text-xs text-slate-400">+{new Set(items.map(i => i.companyName)).size - 2} more</span>
                          )}
                        </div>
                        {isExpanded
                          ? <FaChevronDown className="text-slate-400 text-xs" />
                          : <FaChevronRight className="text-slate-400 text-xs" />
                        }
                      </div>
                    </div>

                    {/* Territory Rows (Expanded) */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 divide-y divide-slate-50">
                        {items.map((item) => {
                          const badge = scopeBadge(item);
                          return (
                            <div key={item._id} className="flex items-center justify-between px-5 py-3 hover:bg-teal-50/30 group transition">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badge.color}`}>
                                  {badge.label}
                                </span>
                                <div className="text-sm text-slate-700">
                                  <span className="font-medium text-slate-500 text-xs">{item.companyName}</span>
                                  <span className="mx-1.5 text-slate-300">›</span>
                                  <span className="font-semibold">{scopeLabel(item)}</span>
                                </div>
                                {!item.subDivisionCode && !item.categoryCode && (
                                  <span className="text-xs text-slate-400 italic">(All sub-divisions & categories)</span>
                                )}
                                {item.subDivisionCode && !item.categoryCode && (
                                  <span className="text-xs text-slate-400 italic">(All categories)</span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${item.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                                  {item.status}
                                </span>
                                <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition opacity-0 group-hover:opacity-100" title="Edit">
                                  <FaEdit />
                                </button>
                                <button onClick={() => setDeleteTarget(item)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100" title="Remove">
                                  <FaTrashAlt />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Another Territory for Same MR */}
                        <div className="px-5 py-2.5">
                          <button
                            onClick={() => {
                              setFormData({ ...initialFormState, userId: typeof user.userId === "string" ? user.userId : (user.userId as any)?._id || "" });
                              setViewState("add");
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline"
                          >
                            <FaPlus className="text-[10px]" /> Add another territory for {user.userName}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-xs text-slate-500 text-right">
            Showing <strong>{filtered.length}</strong> assignments across <strong>{grouped.length}</strong> MRs
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              <FaExclamationTriangle />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Remove Territory?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Remove <strong>{deleteTarget.userName}</strong>&apos;s assignment to{" "}
                <strong>{deleteTarget.divisionName}</strong>
                {deleteTarget.categoryName && ` → ${deleteTarget.categoryName}`}?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingId === deleteTarget._id}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingId === deleteTarget._id ? "Removing..." : "Remove Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Setup Complete Footer ── */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P1</span>
            <span className="text-emerald-600 font-medium">Company</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P2</span>
            <span className="text-emerald-600 font-medium">Division</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P3</span>
            <span className="text-emerald-600 font-medium">Sub Division</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P4</span>
            <span className="text-emerald-600 font-medium">Category</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P5</span>
            <span className="text-emerald-600 font-medium">Product</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P6</span>
            <span className="text-emerald-600 font-medium">Customer</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">P7</span>
            <span className="font-bold text-emerald-700">Salesman (MR)</span>
            <span className="ml-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">✅ All Phases Done!</span>
          </div>
          <Link
            href="/dashboard/master"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
          >
            <FaCheckCircle size={13} />
            Setup Complete — Back to Masters
          </Link>
        </div>
      </div>

    </div>
  );
}
