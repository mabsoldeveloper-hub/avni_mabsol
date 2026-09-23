"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaSitemap,
  FaUserTie,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrashAlt,
  FaArrowLeft,
  FaSave,
  FaBuilding,
  FaNetworkWired,
  FaCheckCircle,
  FaTimes,
  FaChevronDown,
  FaChevronRight,
  FaMapMarkerAlt,
  FaCrown,
  FaUserShield,
  FaUserCog,
  FaUser,
} from "react-icons/fa";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  employeeCode?: string;
  designation?: string;
}

interface HierarchyItem {
  _id: string;
  userId: string | { _id: string; name: string; email: string; employeeCode?: string };
  userName: string;
  employeeCode: string;
  roleLevel: "RSM" | "MR" | "ASM" | "VP" | "NSM" | "ZSM";
  state: string;
  zone: string;
  region: string;
  territory: string;
  reportsTo: string | { _id: string; name: string; email: string } | null;
  reportsToName: string;
  notes: string;
  status: "Active" | "Inactive";
  createdAt?: string;
}

const roleBadges: Record<string, { label: string; bg: string; icon: any }> = {
  ZSM: { label: "Zonal Sales Mgr (ZSM)", bg: "bg-blue-500/15 text-blue-700 border-blue-300", icon: FaUserCog },
  RSM: { label: "Regional Sales Mgr (RSM)", bg: "bg-teal-500/15 text-teal-700 border-teal-300", icon: FaUserTie },
  MR: { label: "Sales Rep (M.R.)", bg: "bg-emerald-500/15 text-emerald-700 border-emerald-300", icon: FaUser },
  // Legacy support for previously created records:
  ASM: { label: "Area Sales Mgr (ASM)", bg: "bg-amber-500/15 text-amber-700 border-amber-300", icon: FaUserTie },
  NSM: { label: "National Sales Mgr (NSM)", bg: "bg-indigo-500/15 text-indigo-700 border-indigo-300", icon: FaUserShield },
  VP: { label: "VP Sales", bg: "bg-purple-500/15 text-purple-700 border-purple-300", icon: FaCrown },
};

export default function SalesHierarchyMasterPage() {
  const [hierarchy, setHierarchy] = useState<HierarchyItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [viewState, setViewState] = useState<"list" | "add" | "edit">("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    userId: "",
    roleLevel: "MR" as "RSM" | "MR" | "ASM" | "VP" | "NSM" | "ZSM",
    state: "",
    zone: "",
    region: "",
    territory: "",
    reportsTo: "",
    notes: "",
    status: "Active" as "Active" | "Inactive",
  });

  const [dynamicRoles, setDynamicRoles] = useState<{ _id: string; roleName: string }[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchHierarchy();
  }, []);

  async function fetchRoles() {
    try {
      const res = await fetch("/api/roles");
      const json = await res.json();
      if (Array.isArray(json)) setDynamicRoles(json);
      else if (json.data && Array.isArray(json.data)) setDynamicRoles(json.data);
    } catch (e) {
      console.error("Failed to load roles", e);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success || Array.isArray(json)) {
        setUsers(Array.isArray(json) ? json : json.users || json.data || []);
      }
    } catch (e) {
      console.error("Failed to load users", e);
    }
  }

  async function fetchHierarchy() {
    setLoading(true);
    try {
      const res = await fetch("/api/sales-hierarchy");
      const json = await res.json();
      if (json.success) {
        setHierarchy(json.data || []);
      }
    } catch (e) {
      setError("Failed to load sales hierarchy records");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return hierarchy.filter((item) => {
      const s = search.toLowerCase();
      const matchSearch =
        !search ||
        item.userName.toLowerCase().includes(s) ||
        (item.employeeCode && item.employeeCode.toLowerCase().includes(s)) ||
        (item.state && item.state.toLowerCase().includes(s)) ||
        (item.region && item.region.toLowerCase().includes(s)) ||
        (item.reportsToName && item.reportsToName.toLowerCase().includes(s));
      const matchRole = !roleFilter || item.roleLevel === roleFilter;
      return matchSearch && matchRole;
    });
  }, [hierarchy, search, roleFilter]);

  const handleOpenAdd = () => {
    setFormData({
      userId: "",
      roleLevel: "MR",
      state: "",
      zone: "",
      region: "",
      territory: "",
      reportsTo: "",
      notes: "",
      status: "Active",
    });
    setEditId(null);
    setError(null);
    setSuccess(null);
    setViewState("add");
  };

  const handleOpenEdit = (item: HierarchyItem) => {
    const uid = typeof item.userId === "string" ? item.userId : item.userId?._id || "";
    const parentId = typeof item.reportsTo === "string" ? item.reportsTo : item.reportsTo?._id || "";
    setFormData({
      userId: uid,
      roleLevel: item.roleLevel,
      state: item.state || "",
      zone: item.zone || "",
      region: item.region || "",
      territory: item.territory || "",
      reportsTo: parentId,
      notes: item.notes || "",
      status: item.status,
    });
    setEditId(item._id);
    setError(null);
    setSuccess(null);
    setViewState("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.roleLevel) {
      setError("Please select an Executive User and Role Level.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const url = editId ? `/api/sales-hierarchy/${editId}` : "/api/sales-hierarchy";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(editId ? "Hierarchy record updated successfully!" : "Hierarchy record created successfully!");
        fetchHierarchy();
        setViewState("list");
      } else {
        setError(json.message || "Operation failed.");
      }
    } catch (err: any) {
      setError("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this hierarchy record?")) return;
    try {
      const res = await fetch(`/api/sales-hierarchy/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setSuccess("Record removed.");
        fetchHierarchy();
      } else {
        setError(json.message || "Delete failed.");
      }
    } catch {
      setError("Failed to delete record.");
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/20 backdrop-blur-md border border-white/30">
                Sales Operations Hierarchy
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                ZSM → RSM → MR → Customer
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Sales Hierarchy Master Hub</h1>
            <p className="text-xs text-white/80 mt-1">
              Maintain reporting hierarchy from Zonal Sales Managers (ZSM) and Regional Sales Managers (RSM) down to Medical Representatives (MR) and Customers.
            </p>
          </div>
          {viewState === "list" && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs shadow-lg hover:bg-indigo-50 transition-all hover:scale-105"
            >
              <FaPlus /> Add Hierarchy Mapping
            </button>
          )}
        </div>
      </div>

      {/* Status Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><FaTimes /></button>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}><FaTimes /></button>
        </div>
      )}

      {/* MAIN VIEW MODE: LIST / ADD / EDIT */}
      {viewState === "list" ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-72">
              <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search executive, region, state..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 font-semibold focus:outline-none"
              >
                <option value="">All Roles (from Role Master)</option>
                {dynamicRoles.map((r) => (
                  <option key={r._id} value={r.roleName}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hierarchy Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-500">Loading sales hierarchy...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center bg-white/50 backdrop-blur-md rounded-2xl border border-dashed border-slate-300">
              <p className="text-xs font-semibold text-slate-600">No hierarchy records found.</p>
              <button
                onClick={handleOpenAdd}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                <FaPlus size={10} /> Add First Mapping
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const badge = roleBadges[item.roleLevel] || roleBadges.MR;
                const IconComponent = badge.icon;

                return (
                  <div
                    key={item._id}
                    className="relative rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{item.userName}</h4>
                          {item.employeeCode && (
                            <p className="text-[10px] font-medium text-slate-400">Emp Code: {item.employeeCode}</p>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      {item.reportsToName && (
                        <p className="text-[11px] font-semibold text-indigo-900 flex items-center gap-1.5">
                          <span className="text-slate-400">Reports To:</span> {item.reportsToName}
                        </p>
                      )}
                      {item.state && (
                        <p className="text-[11px]">
                          <span className="text-slate-400">State / Zone:</span> {item.state} {item.zone ? `(${item.zone})` : ""}
                        </p>
                      )}
                      {item.region && (
                        <p className="text-[11px]">
                          <span className="text-slate-400">Region / Territory:</span> {item.region} {item.territory ? `/ ${item.territory}` : ""}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {item.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <FaTrashAlt size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ADD / EDIT FORM */
        <div className="max-w-2xl mx-auto bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {viewState === "add" ? "Add New Sales Hierarchy Mapping" : "Edit Hierarchy Mapping"}
            </h3>
            <button
              onClick={() => setViewState("list")}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <FaArrowLeft /> Back to List
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Executive User *</label>
              <select
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
                disabled={viewState === "edit"}
              >
                <option value="">-- Select Executive User --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} {u.employeeCode ? `(${u.employeeCode})` : ""} - {u.designation || "Executive"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hierarchy Role Level *</label>
                <select
                  value={formData.roleLevel}
                  onChange={(e) => setFormData({ ...formData, roleLevel: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  {dynamicRoles.map((r) => (
                    <option key={r._id} value={r.roleName}>
                      {r.roleName}
                    </option>
                  ))}
                  {formData.roleLevel && !dynamicRoles.some((r) => r.roleName === formData.roleLevel) && (
                    <option value={formData.roleLevel}>{formData.roleLevel}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reports To (Parent Manager)</label>
                <select
                  value={formData.reportsTo}
                  onChange={(e) => setFormData({ ...formData, reportsTo: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- None (Top Executive) --</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.employeeCode ? `(${u.employeeCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State / Zone</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Uttar Pradesh"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Region / Territory</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="e.g. Lucknow Region"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewState("list")}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md flex items-center gap-1.5"
              >
                <FaSave /> {saving ? "Saving..." : "Save Hierarchy"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
