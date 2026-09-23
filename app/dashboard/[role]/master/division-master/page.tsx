"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaSitemap,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaArrowRight,
  FaUndo,
  FaSave,
  FaBuilding,
  FaFilter,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaTimes,
  FaSync,
} from "react-icons/fa";

interface CompanyItem {
  _id: string;
  companyCode: string;
  companyName: string;
  status: string;
}

interface DivisionItem {
  _id: string;
  companyCode: string;
  companyName: string;
  divisionCode: string;
  divisionName: string;
  shortName: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt?: string;
  updatedAt?: string;
}

interface DivisionFormData {
  companyCode: string;
  companyName: string;
  divisionCode: string;
  divisionName: string;
  shortName: string;
  description: string;
  status: "Active" | "Inactive";
}

const initialFormState: DivisionFormData = {
  companyCode: "",
  companyName: "",
  divisionCode: "",
  divisionName: "",
  shortName: "",
  description: "",
  status: "Active",
};

export default function DivisionMasterPage() {
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // View state: 'list' | 'add' | 'edit'
  const [viewState, setViewState] = useState<"list" | "add" | "edit">("list");
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<DivisionFormData>(initialFormState);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DivisionFormData, string>>>({});

  // Confirmation Modal for Deletion
  const [deleteTarget, setDeleteTarget] = useState<DivisionItem | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchCompanies() {
    try {
      const res = await fetch("/api/master/fetch-company-master");
      const json = await res.json();
      if (json.success) {
        setCompanies(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    }
  }

  async function fetchDivisions() {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (companyFilter) queryParams.append("companyCode", companyFilter);
      if (statusFilter) queryParams.append("status", statusFilter);

      const res = await fetch(`/api/division-master?${queryParams.toString()}`);
      const json = await res.json();

      if (json.success) {
        setDivisions(json.data || []);
      } else {
        setError(json.message || "Failed to load divisions");
      }
    } catch (err: any) {
      console.error("Fetch divisions error:", err);
      setError("An error occurred while fetching divisions.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchInitialData() {
    await Promise.all([fetchCompanies(), fetchDivisions()]);
  }

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = divisions.length;
    const active = divisions.filter((d) => d.status === "Active").length;
    const inactive = divisions.filter((d) => d.status === "Inactive").length;
    return { total, active, inactive };
  }, [divisions]);

  // Filtered Divisions client-side fallback
  const filteredDivisions = useMemo(() => {
    return divisions.filter((d) => {
      const matchesSearch =
        !search ||
        d.divisionCode.toLowerCase().includes(search.toLowerCase()) ||
        d.divisionName.toLowerCase().includes(search.toLowerCase()) ||
        (d.shortName && d.shortName.toLowerCase().includes(search.toLowerCase())) ||
        d.companyName.toLowerCase().includes(search.toLowerCase()) ||
        d.companyCode.toLowerCase().includes(search.toLowerCase());

      const matchesCompany = !companyFilter || d.companyCode === companyFilter;
      const matchesStatus = !statusFilter || d.status === statusFilter;

      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [divisions, search, companyFilter, statusFilter]);

  // Handle Form Open for Add
  const handleOpenAdd = () => {
    setFormData(initialFormState);
    setFormErrors({});
    setError(null);
    setSuccess(null);
    setEditId(null);
    setViewState("add");
  };

  // Handle Form Open for Edit
  const handleOpenEdit = (item: DivisionItem) => {
    setFormData({
      companyCode: item.companyCode,
      companyName: item.companyName,
      divisionCode: item.divisionCode,
      divisionName: item.divisionName,
      shortName: item.shortName || "",
      description: item.description || "",
      status: item.status,
    });
    setFormErrors({});
    setError(null);
    setSuccess(null);
    setEditId(item._id);
    setViewState("edit");
  };

  // Handle Company Selection in Form
  const handleCompanyChange = (code: string) => {
    const selectedCompany = companies.find((c) => c.companyCode === code);
    setFormData((prev) => ({
      ...prev,
      companyCode: code,
      companyName: selectedCompany ? selectedCompany.companyName : "",
    }));
    if (formErrors.companyCode) {
      setFormErrors((prev) => ({ ...prev, companyCode: undefined }));
    }
  };

  // Validate Form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof DivisionFormData, string>> = {};

    if (!formData.companyCode) {
      errors.companyCode = "Company is required";
    }
    if (!formData.divisionCode.trim()) {
      errors.divisionCode = "Division Code is required";
    }
    if (!formData.divisionName.trim()) {
      errors.divisionName = "Division Name is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submit (Save)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const url = editId ? `/api/division-master/${editId}` : "/api/division-master";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (json.success) {
        setSuccess(json.message || `Division ${editId ? "updated" : "created"} successfully!`);
        await fetchDivisions();
        setTimeout(() => {
          setViewState("list");
          setSuccess(null);
        }, 1200);
      } else {
        setError(json.message || "Failed to save division.");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setError("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // Reset Form
  const handleReset = () => {
    if (editId) {
      const original = divisions.find((d) => d._id === editId);
      if (original) {
        setFormData({
          companyCode: original.companyCode,
          companyName: original.companyName,
          divisionCode: original.divisionCode,
          divisionName: original.divisionName,
          shortName: original.shortName || "",
          description: original.description || "",
          status: original.status,
        });
      }
    } else {
      setFormData(initialFormState);
    }
    setFormErrors({});
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget._id);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/division-master/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.success) {
        setSuccess(`Division '${deleteTarget.divisionName}' deleted successfully.`);
        await fetchDivisions();
      } else {
        setError(json.message || "Failed to delete division.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("An error occurred while deleting division.");
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 p-5 rounded-2xl text-slate-800 shadow-sm border border-indigo-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <FaSitemap className="text-2xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                Phase 2
              </span>
              <span className="text-xs text-slate-500 font-medium">Master Hierarchy</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
              Division Master
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/master"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all"
          >
            <FaArrowLeft /> Back to Masters
          </Link>

          {viewState === "list" && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <FaPlus /> Add Division
            </button>
          )}
        </div>
      </div>

      {/* Global Toast / Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-rose-500 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
            <FaTimes />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-600">
            <FaTimes />
          </button>
        </div>
      )}

      {/* VIEW STATE: ADD OR EDIT SCREEN */}
      {(viewState === "add" || viewState === "edit") && (
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {viewState === "add" ? "Add New Division" : "Edit Division"}
              </h2>
              <p className="text-xs text-slate-500">
                {viewState === "add"
                  ? "Create a new business division mapped to a company."
                  : `Update division details for Code: ${formData.divisionCode}`}
              </p>
            </div>

            <button
              onClick={() => setViewState("list")}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition"
            >
              <FaArrowLeft /> Back to List
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Selection * */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Company <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.companyCode}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                    formErrors.companyCode ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                  }`}
                >
                  <option value="">-- Select Company --</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c.companyCode}>
                      {c.companyName} ({c.companyCode})
                    </option>
                  ))}
                </select>
                {formErrors.companyCode && (
                  <p className="text-xs text-rose-500 mt-1">{formErrors.companyCode}</p>
                )}
              </div>

              {/* Division Code * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Division Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. PHARMA, SURG, OTC"
                  value={formData.divisionCode}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      divisionCode: e.target.value.toUpperCase(),
                    }));
                    if (formErrors.divisionCode) {
                      setFormErrors((prev) => ({ ...prev, divisionCode: undefined }));
                    }
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm uppercase bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                    formErrors.divisionCode ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                  }`}
                />
                {formErrors.divisionCode && (
                  <p className="text-xs text-rose-500 mt-1">{formErrors.divisionCode}</p>
                )}
              </div>

              {/* Division Name * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Division Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pharma Division"
                  value={formData.divisionName}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, divisionName: e.target.value }));
                    if (formErrors.divisionName) {
                      setFormErrors((prev) => ({ ...prev, divisionName: undefined }));
                    }
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                    formErrors.divisionName ? "border-rose-400 bg-rose-50/30" : "border-slate-300"
                  }`}
                />
                {formErrors.divisionName && (
                  <p className="text-xs text-rose-500 mt-1">{formErrors.divisionName}</p>
                )}
              </div>

              {/* Short Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Short Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. PHARM"
                  value={formData.shortName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shortName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as "Active" | "Inactive",
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter division description or remarks..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Action Buttons: Save, Reset, Back */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewState("list")}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <FaArrowLeft /> Back
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <FaUndo /> Reset
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <FaSave /> {saving ? "Saving..." : editId ? "Update Division" : "Save Division"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW STATE: DASHBOARD LIST & TABLE VIEW */}
      {viewState === "list" && (
        <div className="space-y-6">
          {/* Summary Cards Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Divisions
                </p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{metrics.total}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                <FaSitemap />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  Active Divisions
                </p>
                <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics.active}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                <FaCheckCircle />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
                  Inactive Divisions
                </p>
                <h3 className="text-3xl font-extrabold text-rose-500 mt-1">{metrics.inactive}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-xl">
                <FaTimesCircle />
              </div>
            </div>
          </div>

          {/* Controls Bar: Search & Filters */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Code, Name, Company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Company Filter Dropdown */}
              <div className="flex items-center gap-2">
                <FaBuilding className="text-slate-400 text-xs" />
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition"
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c.companyCode}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-2">
                <FaFilter className="text-slate-400 text-xs" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchDivisions}
                className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                title="Refresh Divisions"
              >
                <FaSync className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Division Table View */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4">Company</th>
                    <th className="py-3.5 px-4">Division Code</th>
                    <th className="py-3.5 px-4">Division Name</th>
                    <th className="py-3.5 px-4">Short Name</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <FaSync className="animate-spin text-2xl text-indigo-500" />
                          <span>Loading Divisions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDivisions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <FaSitemap className="text-3xl text-slate-300" />
                          <span className="font-medium text-slate-600">No Divisions Found</span>
                          <p className="text-xs text-slate-400">
                            Try adjusting your filters or click &quot;Add Division&quot; to create one.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDivisions.map((division, idx) => (
                      <tr
                        key={division._id}
                        className="hover:bg-indigo-50/30 transition-colors group"
                      >
                        <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{division.companyName}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            {division.companyCode}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-100">
                            {division.divisionCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {division.divisionName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          {division.shortName || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs max-w-xs truncate">
                          {division.description || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              division.status === "Active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                division.status === "Active" ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            {division.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(division)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Division"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(division)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Division"
                            >
                              <FaTrashAlt />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong>{filteredDivisions.length}</strong> of{" "}
                <strong>{divisions.length}</strong> divisions
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              <FaExclamationTriangle />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Confirm Deletion</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to delete division{" "}
                <strong className="text-slate-800">{deleteTarget.divisionName}</strong> (
                <code>{deleteTarget.divisionCode}</code>)?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingId === deleteTarget._id}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-600/25 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingId === deleteTarget._id ? "Deleting..." : "Delete Division"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Next Step Footer ── */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">P1</span>
            <span className="text-emerald-600 font-medium">Company</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">P2</span>
            <span className="font-semibold text-slate-700">Division</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">P3</span>
            <span>Sub Division</span>
            <span className="hidden sm:inline text-slate-300">→</span>
            <span className="hidden sm:inline">Category → Product → Customer → Salesman</span>
          </div>
          <Link
            href="/dashboard/master/sub-division-master"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
          >
            Next Step: Sub Division
            <FaArrowRight size={12} />
          </Link>
        </div>
      </div>

    </div>
  );
}
