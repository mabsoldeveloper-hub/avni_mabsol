"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaKey } from "react-icons/fa";

export default function CreatePermissionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    moduleName: "",
    permissionName: "",
    permissionKey: "",
    status: "Active",
  });

  // Auto Generate Permission Key
  const generateKey = (moduleName: string, permissionName: string) => {
    const module = moduleName.trim().toLowerCase().replace(/\s+/g, "");

    let action = "";
    const text = permissionName.toLowerCase();

    if (text.includes("view")) action = "view";
    else if (text.includes("create")) action = "create";
    else if (text.includes("add")) action = "create";
    else if (text.includes("edit")) action = "edit";
    else if (text.includes("update")) action = "edit";
    else if (text.includes("delete")) action = "delete";
    else if (text.includes("export")) action = "export";
    else if (text.includes("print")) action = "print";
    else action = permissionName.trim().toLowerCase().replace(/\s+/g, "");

    return `${module}.${action}`;
  };

  const savePermission = async () => {
    try {
      setLoading(true);

      await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      alert("Permission Created");
      router.push("/dashboard/permissions");
    } catch (error) {
      alert("Failed to Create Permission");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg text-sm px-3 py-2 bg-white/50 border border-white/60 text-gray-700 placeholder-gray-400 outline-none focus:bg-white/70 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20 transition-all";

  const labelClass =
    "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div
      className="
        relative rounded-2xl overflow-hidden
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* header */}
      <div className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500/80 to-violet-500/80 backdrop-blur-md">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
          <FaKey size={13} />
        </div>
        <h5 className="text-sm font-semibold text-white tracking-wide m-0">
          Create Permission
        </h5>
      </div>

      {/* body */}
      <div className="relative p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Module */}
          <div className="md:col-span-1">
            <label className={labelClass}>Module</label>
            <input
              className={inputClass}
              placeholder="e.g. Users"
              value={form.moduleName}
              onChange={(e) => {
                const moduleName = e.target.value;
                setForm({
                  ...form,
                  moduleName,
                  permissionKey: generateKey(moduleName, form.permissionName),
                });
              }}
            />
          </div>

          {/* Permission */}
          <div className="md:col-span-1">
            <label className={labelClass}>Permission</label>
            <input
              className={inputClass}
              placeholder="e.g. View Users"
              value={form.permissionName}
              onChange={(e) => {
                const permissionName = e.target.value;
                setForm({
                  ...form,
                  permissionName,
                  permissionKey: generateKey(form.moduleName, permissionName),
                });
              }}
            />
          </div>

          {/* Permission Key */}
          <div className="md:col-span-2">
            <label className={labelClass}>Permission Key</label>
            <input
              className={`${inputClass} font-mono`}
              value={form.permissionKey}
              onChange={(e) =>
                setForm({ ...form, permissionKey: e.target.value })
              }
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Auto-generated, editable — e.g.{" "}
              <span className="font-mono text-indigo-500">users.view</span>
            </p>
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3 border-t border-gray-200/70 pt-4">
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500/90 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={savePermission}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Permission"}
          </button>

          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white/50 hover:bg-white/70 border border-white/60 transition-colors"
            onClick={() => router.push("/dashboard/permissions")}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}