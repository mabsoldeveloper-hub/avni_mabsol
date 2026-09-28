"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FaUserShield, FaMapMarkerAlt, FaCheckCircle, FaArrowLeft, FaSave, FaSyncAlt, FaSearch, FaPlus, FaTimes } from "react-icons/fa";

export default function EditRolePage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [gstInput, setGstInput] = useState("");
  const [isVerifyingGst, setIsVerifyingGst] = useState(false);
  const [gstMessage, setGstMessage] = useState<string | null>(null);
  const [areaInput, setAreaInput] = useState("");

  const [form, setForm] = useState({
    roleName: "",
    description: "",
    assignedAreaNames: [] as string[],
    status: "Active",
  });

  useEffect(() => {
    loadRole();
  }, [id]);

  const loadRole = async () => {
    try {
      setFetching(true);
      const res = await fetch(`/api/roles/${id}`);
      const data = await res.json();
      setForm({
        roleName: data.roleName || "",
        description: data.description || "",
        assignedAreaNames: Array.isArray(data.assignedAreaNames) ? data.assignedAreaNames : [],
        status: data.status || "Active",
      });
    } catch (error) {
      console.error("Failed to load role:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleVerifyGst = async () => {
    const clean = gstInput.trim().toUpperCase();
    if (!clean || clean.length !== 15) {
      alert("Please enter a valid 15-character GSTIN (e.g. 06AALCM8009M1Z1)");
      return;
    }

    try {
      setIsVerifyingGst(true);
      setGstMessage(null);

      const res = await fetch("/api/auth/verify-gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: clean }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        const newAreas = new Set(form.assignedAreaNames);
        if (d.city) newAreas.add(d.city);
        if (d.state || d.stateName) newAreas.add(d.state || d.stateName);

        setForm((prev) => ({
          ...prev,
          assignedAreaNames: Array.from(newAreas),
        }));

        const locName = `${d.city || ""}${d.city && d.state ? ", " : ""}${d.state || ""}`;
        setGstMessage(`✓ Verified location: ${locName || clean}`);
      } else {
        setGstMessage(json.message || "Invalid GSTIN or record not found");
      }
    } catch {
      setGstMessage("Failed to connect to GST verification service");
    } finally {
      setIsVerifyingGst(false);
    }
  };

  const handleAddArea = () => {
    const trimmed = areaInput.trim();
    if (!trimmed) return;
    if (!form.assignedAreaNames.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        assignedAreaNames: [...prev.assignedAreaNames, trimmed],
      }));
    }
    setAreaInput("");
  };

  const handleRemoveArea = (areaName: string) => {
    setForm((prev) => ({
      ...prev,
      assignedAreaNames: prev.assignedAreaNames.filter((a) => a !== areaName),
    }));
  };

  const updateRole = async () => {
    if (!form.roleName.trim()) {
      alert("Please enter a Role Name");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update role");
        return;
      }

      alert("Role Updated Successfully!");
      router.push("/dashboard/roles");
    } catch (error) {
      alert("Failed to Update Role");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";

  const labelClass =
    "block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5";

  if (fetching) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <FaSyncAlt size={24} className="animate-spin text-indigo-600" />
        <span className="text-xs font-semibold">Loading role details...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/dashboard/roles" className="hover:text-indigo-600 flex items-center gap-1">
              <FaArrowLeft size={10} /> Roles Management
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200 font-semibold">Edit Role: {form.roleName}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
              <FaUserShield size={14} />
            </div>
            Edit Role &amp; Territory Scope
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/roles"
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={updateRole}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/25 transition-all hover:scale-102 disabled:opacity-50"
          >
            <FaSave size={12} /> {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
          {/* Role Name */}
          <div>
            <label className={labelClass}>
              Role Name <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClass}
              value={form.roleName}
              onChange={(e) => setForm({ ...form, roleName: e.target.value })}
            />
          </div>

          {/* Status */}
          <div>
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className={labelClass}>Description / Role Responsibilities</label>
            <textarea
              rows={2}
              className={inputClass}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        {/* Territory & Areas via GST or Tag Input */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3.5">
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <FaMapMarkerAlt className="text-purple-600" /> Associated Territory Areas &amp; GST Scope
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Fetch territories from verified GSTIN or add custom territory areas for this role.
            </p>
          </div>

          {/* GST Auto-Fetch Tool */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Enter 15-digit GSTIN to auto-fetch territory (e.g. 06AALCM8009M1Z1)"
                value={gstInput}
                onChange={(e) => setGstInput(e.target.value.toUpperCase())}
                className="w-full text-xs px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 uppercase outline-none font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleVerifyGst}
              disabled={isVerifyingGst || !gstInput.trim()}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold shrink-0 hover:bg-purple-500 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <FaSearch size={11} /> {isVerifyingGst ? "Fetching..." : "Fetch with GST"}
            </button>
          </div>

          {gstMessage && (
            <p className={`text-xs font-semibold ${gstMessage.startsWith("✓") ? "text-emerald-600" : "text-rose-500"}`}>
              {gstMessage}
            </p>
          )}

          {/* Custom Area Tag Adder */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Or type custom territory/area name (e.g. Mumbai West, Pune City)"
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddArea();
                }
              }}
              className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={handleAddArea}
              disabled={!areaInput.trim()}
              className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-1 disabled:opacity-50"
            >
              <FaPlus size={10} /> Add Area
            </button>
          </div>

          {/* Current Selected Territory Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {form.assignedAreaNames.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No specific territory areas locked to this role.</span>
            ) : (
              form.assignedAreaNames.map((area, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800"
                >
                  <FaMapMarkerAlt size={10} className="text-purple-500" />
                  {area}
                  <button
                    type="button"
                    onClick={() => handleRemoveArea(area)}
                    className="hover:text-rose-500 ml-1 transition-colors"
                  >
                    <FaTimes size={10} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/dashboard/roles"
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={updateRole}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 transition-all hover:scale-105 disabled:opacity-50"
          >
            {loading ? "Updating Role..." : "✓ Update Role"}
          </button>
        </div>
      </div>
    </div>
  );
}