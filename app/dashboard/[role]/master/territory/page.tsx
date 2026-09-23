"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaSyncAlt,
  FaMapMarkerAlt,
  FaRoute,
  FaBuilding,
  FaWarehouse,
} from "react-icons/fa";

type MasterType = "zone" | "area" | "station" | "route";

type MasterItem = {
  _id: string;
  SCODE: string;
  SGCODE: string;
  SNAME: string;
  TGCODE?: string;
};

type MasterData = Record<MasterType, MasterItem[]>;

const EMPTY_DATA: MasterData = {
  zone: [],
  area: [],
  station: [],
  route: [],
};

const CONFIG: Record<
  MasterType,
  { title: string; singular: string; icon: React.ReactNode; description: string }
> = {
  zone: {
    title: "Zone Master",
    singular: "Zone",
    icon: <FaMapMarkerAlt />,
    description: "Manage all Zone values used by customer territory mapping.",
  },
  area: {
    title: "Area Master",
    singular: "Area",
    icon: <FaBuilding />,
    description: "Manage all Area values used by customer territory mapping.",
  },
  station: {
    title: "Station Master",
    singular: "Station",
    icon: <FaWarehouse />,
    description: "Manage all Station values used by customer territory mapping.",
  },
  route: {
    title: "Route Master",
    singular: "Route",
    icon: <FaRoute />,
    description: "Manage all Route values used by customer territory mapping.",
  },
};

export default function TerritoryMasterPage() {
  const [activeType, setActiveType] = useState<MasterType>("zone");
  const [data, setData] = useState<MasterData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return data[activeType];

    return data[activeType].filter(
      (item) =>
        item.SNAME.toLowerCase().includes(term) ||
        item.SCODE.toLowerCase().includes(term)
    );
  }, [data, activeType, search]);

  const loadMasters = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/master/territory", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load territory masters");
      }

      setData({
        zone: Array.isArray(json.data?.zone) ? json.data.zone : [],
        area: Array.isArray(json.data?.area) ? json.data.area : [],
        station: Array.isArray(json.data?.station) ? json.data.station : [],
        route: Array.isArray(json.data?.route) ? json.data.route : [],
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load territory masters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const addMaster = async () => {
    const name = newName.trim();

    if (!name) {
      setError(`${CONFIG[activeType].singular} name is required`);
      return;
    }

    try {
      setSaving(true);
      clearMessages();

      const res = await fetch("/api/master/territory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeType,
          SNAME: name,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create master");
      }

      setNewName("");
      setSuccess(`${CONFIG[activeType].singular} "${name}" added successfully.`);
      await loadMasters();
    } catch (err: any) {
      setError(err?.message || "Failed to create master");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: MasterItem) => {
    clearMessages();
    setEditing(item._id);
    setEditingName(item.SNAME);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditingName("");
  };

  const saveEdit = async (item: MasterItem) => {
    const name = editingName.trim();

    if (!name) {
      setError(`${CONFIG[activeType].singular} name is required`);
      return;
    }

    try {
      setSaving(true);
      clearMessages();

      const res = await fetch("/api/master/territory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeType,
          _id: item._id,
          SNAME: name,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update master");
      }

      cancelEdit();
      setSuccess(`${CONFIG[activeType].singular} updated successfully.`);
      await loadMasters();
    } catch (err: any) {
      setError(err?.message || "Failed to update master");
    } finally {
      setSaving(false);
    }
  };

  const deleteMaster = async (item: MasterItem) => {
    const ok = window.confirm(
      `Delete ${CONFIG[activeType].singular} "${item.SNAME}"?\n\n` +
        `Existing customer values will not be changed, but this master value will no longer appear for new selections.`
    );

    if (!ok) return;

    try {
      setSaving(true);
      clearMessages();

      const res = await fetch(
        `/api/master/territory?type=${encodeURIComponent(activeType)}&id=${encodeURIComponent(item._id)}`,
        { method: "DELETE" }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete master");
      }

      if (editing === item._id) cancelEdit();

      setSuccess(`${CONFIG[activeType].singular} deleted successfully.`);
      await loadMasters();
    } catch (err: any) {
      setError(err?.message || "Failed to delete master");
    } finally {
      setSaving(false);
    }
  };

  const tabCount = (type: MasterType) => data[type].length;

  return (
    <div className="min-h-screen bg-[#f5f6fb] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#343872]">
                Territory Master
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage Zone, Area, Station and Route from the existing SALETYPE collection.
              </p>
            </div>

            <button
              type="button"
              onClick={loadMasters}
              disabled={loading || saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#343872] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(CONFIG) as MasterType[]).map((type) => {
            const active = activeType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setActiveType(type);
                  setSearch("");
                  cancelEdit();
                  clearMessages();
                }}
                className={`text-left rounded-2xl border p-4 transition-all ${
                  active
                    ? "bg-[#343872] text-white border-[#343872] shadow-md"
                    : "bg-white text-slate-700 border-slate-200 hover:border-[#343872]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{CONFIG[type].icon}</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      active
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tabCount(type)}
                  </span>
                </div>

                <div className="font-bold mt-3">{CONFIG[type].title}</div>
                <div
                  className={`text-xs mt-1 ${
                    active ? "text-white/70" : "text-slate-500"
                  }`}
                >
                  {CONFIG[type].description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Add */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#343872]/10 text-[#343872] flex items-center justify-center">
              <FaPlus />
            </div>
            <div>
              <h2 className="font-bold text-[#343872]">
                Add {CONFIG[activeType].singular}
              </h2>
              <p className="text-xs text-slate-500">
                A new SALETYPE code will be generated automatically.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !saving) addMaster();
              }}
              placeholder={`Enter ${CONFIG[activeType].singular} name`}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#343872]/20 focus:border-[#343872]"
              disabled={saving}
            />

            <button
              type="button"
              onClick={addMaster}
              disabled={saving || !newName.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <FaPlus />
              {saving ? "Saving..." : `Add ${CONFIG[activeType].singular}`}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#343872]">
                {CONFIG[activeType].title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Existing SALETYPE records and admin-created records are shown together.
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${CONFIG[activeType].singular}...`}
              className="w-full md:w-72 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#343872]/20"
            />
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Loading masters...
            </div>
          ) : currentItems.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-slate-300 text-4xl mb-3">
                {CONFIG[activeType].icon}
              </div>
              <div className="font-semibold text-slate-600">
                No {CONFIG[activeType].singular.toLowerCase()} found
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Add a new one above.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#343872] text-white">
                    <th className="text-left px-5 py-3 w-16">#</th>
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">Code</th>
                    <th className="text-left px-5 py-3">SGCODE</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {currentItems.map((item, index) => {
                    const isEditing = editing === item._id;

                    return (
                      <tr
                        key={item._id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-5 py-3 text-slate-500">
                          {index + 1}
                        </td>

                        <td className="px-5 py-3">
                          {isEditing ? (
                            <input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !saving) {
                                  saveEdit(item);
                                }
                              }}
                              autoFocus
                              className="w-full max-w-md rounded-lg border border-[#343872] px-3 py-2 outline-none"
                            />
                          ) : (
                            <span className="font-semibold text-slate-700">
                              {item.SNAME}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                          {item.SCODE || "-"}
                        </td>

                        <td className="px-5 py-3">
                          <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                            {item.SGCODE}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveEdit(item)}
                                  disabled={saving || !editingName.trim()}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                                >
                                  <FaSave />
                                  Save
                                </button>

                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-50"
                                >
                                  <FaTimes />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold disabled:opacity-50"
                                >
                                  <FaEdit />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteMaster(item)}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-semibold disabled:opacity-50"
                                >
                                  <FaTrash />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mapping note */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
          <div className="font-bold mb-1">How this works</div>
          <div className="text-xs leading-5">
            Existing values come from SALETYPE. New values are also saved into SALETYPE,
            so the Customer Zone / Area / Station / Route selectors can use one common source.
            Route records are created with <b>SGCODE = ROUT</b>, matching your VFP data.
          </div>
        </div>
      </div>
    </div>
  );
}
