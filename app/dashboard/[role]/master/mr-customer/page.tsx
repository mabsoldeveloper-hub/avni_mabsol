"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaUserCheck,
  FaUsers,
  FaPlus,
  FaSearch,
  FaTrashAlt,
  FaArrowLeft,
  FaSave,
  FaTimes,
  FaStore,
  FaUser,
  FaCheckSquare,
  FaSquare,
  FaFilter,
  FaCheckCircle,
} from "react-icons/fa";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  employeeCode?: string;
  designation?: string;
}

interface CustomerOption {
  uniqueId: string;
  code: string;
  name: string;
  city?: string;
  area?: string;
}

interface AssignmentItem {
  _id: string;
  userId: string | { _id: string; name: string; email: string; employeeCode?: string };
  userName: string;
  employeeCode?: string;
  customerCode: string;
  customerName: string;
  city?: string;
  area?: string;
  createdAt?: string;
}

export default function MrCustomerAssignmentPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [selectedMrId, setSelectedMrId] = useState<string>("");
  const [selectedCustomerKeys, setSelectedCustomerKeys] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Searches & Filters
  const [customerSearch, setCustomerSearch] = useState("");
  const [overviewSearch, setOverviewSearch] = useState("");
  const [mrFilter, setMrFilter] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchCustomers();
    fetchAssignments();
  }, []);

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

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/reports/customer?report=master&limit=3000");
      const json = await res.json();
      if (json.success && json.data?.rows) {
        const list = json.data.rows.map((c: any, index: number) => {
          const code = (c.CODEP || c.CODE || c.ORDNO || "").toString().trim();
          const name = (c.PARNAM || c.customerName || "Unknown Customer").toString().trim();
          const city = (c.CITY || "").toString().trim();
          const area = (c.AREA || "").toString().trim();
          return {
            uniqueId: `${code || "nocode"}_${name}_${index}`,
            code,
            name,
            city,
            area,
          };
        });
        setCustomers(list);
      }
    } catch (e) {
      console.error("Failed to load customer list", e);
    }
  }

  async function fetchAssignments() {
    setLoading(true);
    try {
      const res = await fetch("/api/mr-customer-assignment");
      const json = await res.json();
      if (json.success) {
        setAssignments(json.data || []);
      }
    } catch (e) {
      setError("Failed to load customer assignments");
    } finally {
      setLoading(false);
    }
  }

  // When selected MR changes, match existing MR assignments by uniqueId
  useEffect(() => {
    if (!selectedMrId || customers.length === 0) {
      setSelectedCustomerKeys(new Set());
      return;
    }

    const mrAssignments = assignments.filter((a) => {
      const uid = typeof a.userId === "string" ? a.userId : a.userId?._id || "";
      return uid === selectedMrId;
    });

    const activeCodes = new Set(mrAssignments.map((a) => (a.customerCode || "").trim().toLowerCase()));
    const activeNames = new Set(mrAssignments.map((a) => (a.customerName || "").trim().toLowerCase()));

    const activeKeys = new Set<string>();
    customers.forEach((c) => {
      const codeKey = c.code ? c.code.toLowerCase() : "";
      const nameKey = c.name ? c.name.toLowerCase() : "";
      if ((codeKey && activeCodes.has(codeKey)) || (nameKey && activeNames.has(nameKey))) {
        activeKeys.add(c.uniqueId);
      }
    });

    setSelectedCustomerKeys(activeKeys);
  }, [selectedMrId, assignments, customers]);

  const filteredCustomerList = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.area && c.area.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  const filteredOverviewAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const s = overviewSearch.toLowerCase();
      const matchSearch =
        !overviewSearch ||
        (item.userName && item.userName.toLowerCase().includes(s)) ||
        (item.customerName && item.customerName.toLowerCase().includes(s)) ||
        (item.customerCode && item.customerCode.toLowerCase().includes(s)) ||
        (item.city && item.city.toLowerCase().includes(s));

      const uid = typeof item.userId === "string" ? item.userId : item.userId?._id || "";
      const matchMr = !mrFilter || uid === mrFilter;

      return matchSearch && matchMr;
    });
  }, [assignments, overviewSearch, mrFilter]);

  const toggleSelectCustomer = (uniqueId: string) => {
    setSelectedCustomerKeys((prev) => {
      const updated = new Set(prev);
      if (updated.has(uniqueId)) {
        updated.delete(uniqueId);
      } else {
        updated.add(uniqueId);
      }
      return updated;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedCustomerKeys((prev) => {
      const updated = new Set(prev);
      filteredCustomerList.forEach((c) => {
        updated.add(c.uniqueId);
      });
      return updated;
    });
  };

  const handleDeselectAllVisible = () => {
    setSelectedCustomerKeys((prev) => {
      const updated = new Set(prev);
      filteredCustomerList.forEach((c) => {
        updated.delete(c.uniqueId);
      });
      return updated;
    });
  };

  const handleSaveAssignments = async () => {
    if (!selectedMrId) {
      setError("Please select an MR Executive first.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const assignedCustomers = customers
      .filter((c) => selectedCustomerKeys.has(c.uniqueId))
      .map((c) => ({
        customerCode: c.code || c.name,
        customerName: c.name,
        city: c.city,
        area: c.area,
      }));

    try {
      const res = await fetch("/api/mr-customer-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedMrId,
          assignedCustomers,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(json.message || "Customer assignments saved successfully.");
        fetchAssignments();
      } else {
        setError(json.message || "Failed to save assignments.");
      }
    } catch {
      setError("An error occurred while saving assignments.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Remove this customer assignment?")) return;
    try {
      const res = await fetch(`/api/mr-customer-assignment?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setSuccess("Assignment removed.");
        fetchAssignments();
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-700 via-emerald-700 to-indigo-800 p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center gap-1.5">
                <FaUserCheck /> MR Customer Assignment Master
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Direct Party Mapping
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">MR Customer Assignment Hub</h1>
            <p className="text-xs text-white/80 mt-1">
              Explicitly assign specific Chemists, Stockists, and Doctors to MR Executives for target tracking and reporting.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
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

      {/* ASSIGNMENT FORM SECTION */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FaUsers className="text-teal-600" /> Step 1: Select MR Executive & Map Customers
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose an executive to view and manage their assigned customer portfolio
            </p>
          </div>

          {selectedMrId && (
            <button
              onClick={handleSaveAssignments}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-md flex items-center gap-2 transition-all hover:scale-105"
            >
              <FaSave /> {saving ? "Saving..." : `Save ${selectedCustomerKeys.size} Customers`}
            </button>
          )}
        </div>

        {/* MR Executive Dropdown */}
        <div className="max-w-md">
          <label className="block text-xs font-bold text-slate-700 mb-1">MR Executive *</label>
          <select
            value={selectedMrId}
            onChange={(e) => setSelectedMrId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-bold bg-slate-50 text-slate-800"
          >
            <option value="">-- Choose MR Executive --</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} {u.employeeCode ? `(${u.employeeCode})` : ""} - {u.designation || "Executive"}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Search & Checklist */}
        {selectedMrId ? (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="relative w-full sm:w-80">
                <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer name, code or city..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                  Assigned: <span className="text-teal-700">{selectedCustomerKeys.size}</span>
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                >
                  Select Visible
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllVisible}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                >
                  Deselect Visible
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-1.5">
              {filteredCustomerList.length === 0 ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-500">No customers found.</div>
              ) : (
                filteredCustomerList.map((c) => {
                  const isChecked = selectedCustomerKeys.has(c.uniqueId);
                  return (
                    <div
                      key={c.uniqueId}
                      onClick={() => toggleSelectCustomer(c.uniqueId)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isChecked ? "bg-teal-50/80 border-teal-300 text-teal-950 font-bold" : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-100/60"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-base ${isChecked ? "text-teal-600" : "text-slate-300"}`}>
                          {isChecked ? <FaCheckSquare /> : <FaSquare />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Code: {c.code || "N/A"} {c.city ? `• ${c.city}` : ""} {c.area ? `• Area: ${c.area}` : ""}
                          </p>
                        </div>
                      </div>

                      {isChecked && (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                          Assigned
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-medium">
            Please select an MR Executive above to start assigning customers.
          </div>
        )}
      </div>

      {/* OVERVIEW TABLE SECTION */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Current MR Customer Mappings Overview</h3>
            <p className="text-xs text-slate-500 mt-0.5">List of all active customer-to-MR assignments across the company</p>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter table..."
                value={overviewSearch}
                onChange={(e) => setOverviewSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <select
              value={mrFilter}
              onChange={(e) => setMrFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold bg-slate-50"
            >
              <option value="">All MR Executives</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center text-xs font-semibold text-slate-500">Loading assignments...</div>
        ) : filteredOverviewAssignments.length === 0 ? (
          <div className="p-8 text-center text-xs font-semibold text-slate-500">No active customer assignments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-3">MR Executive</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Customer Code</th>
                  <th className="p-3">City / Area</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOverviewAssignments.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <FaUser className="text-teal-600" /> {item.userName}
                    </td>
                    <td className="p-3 font-bold text-slate-800">{item.customerName}</td>
                    <td className="p-3 font-medium text-slate-500">{item.customerCode || "—"}</td>
                    <td className="p-3 text-slate-500">{[item.city, item.area].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteAssignment(item._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      >
                        <FaTrashAlt size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
