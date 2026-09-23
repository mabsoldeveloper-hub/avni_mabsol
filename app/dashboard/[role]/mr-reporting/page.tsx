"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FaCalendarCheck,
  FaUserTie,
  FaPlus,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaStethoscope,
  FaStore,
  FaShoppingBag,
  FaEye,
  FaArrowLeft,
  FaSave,
  FaTimes,
  FaBuilding,
  FaMapMarkerAlt,
  FaTrashAlt,
  FaFileExcel,
  FaCheck,
  FaBan,
} from "react-icons/fa";

interface DcrItem {
  _id: string;
  userId: string | { _id: string; name: string; employeeCode?: string };
  userName: string;
  employeeCode: string;
  dcrDate: string;
  workType: string;
  stationType: string;
  areaVisited: string;
  totalDoctorCalls: number;
  totalChemistCalls: number;
  totalStockistCalls: number;
  totalPobAmount: number;
  approvalStatus: "Pending" | "Approved" | "Rejected";
  approvedByName?: string;
  approvalRemarks?: string;
  remarks?: string;
  createdAt?: string;
}

interface CallEntry {
  callType: "Doctor" | "Chemist" | "Stockist";
  partyName: string;
  speciality: string;
  visitShift: "Morning" | "Evening";
  visitedWith: string;
  productName: string;
  sampleQty: number;
  pobAmount: number;
  remarks: string;
}

export default function FullMrReportingPage() {
  const [dcrs, setDcrs] = useState<DcrItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "new">("history");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedDcrDrawer, setSelectedDcrDrawer] = useState<any | null>(null);

  // Approval modal state
  const [approvingDcrId, setApprovingDcrId] = useState<string | null>(null);
  const [approvalStatusInput, setApprovalStatusInput] = useState<"Approved" | "Rejected">("Approved");
  const [approvalRemarksInput, setApprovalRemarksInput] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State for Submit DCR
  const [dcrHeader, setDcrHeader] = useState({
    dcrDate: new Date().toISOString().substring(0, 10),
    workType: "Field Work",
    stationType: "HQ",
    areaVisited: "",
    remarks: "",
  });

  const [callLogs, setCallLogs] = useState<CallEntry[]>([
    {
      callType: "Doctor",
      partyName: "",
      speciality: "MBBS",
      visitShift: "Morning",
      visitedWith: "Self",
      productName: "",
      sampleQty: 0,
      pobAmount: 0,
      remarks: "",
    },
  ]);

  useEffect(() => {
    fetchDcrs();
  }, []);

  async function fetchDcrs() {
    setLoading(true);
    try {
      const res = await fetch("/api/mr-reporting/dcr");
      const json = await res.json();
      if (json.success) {
        setDcrs(json.data || []);
      }
    } catch {
      setError("Failed to fetch DCR records");
    } finally {
      setLoading(false);
    }
  }

  const handleAddCallRow = () => {
    setCallLogs([
      ...callLogs,
      {
        callType: "Doctor",
        partyName: "",
        speciality: "MBBS",
        visitShift: "Morning",
        visitedWith: "Self",
        productName: "",
        sampleQty: 0,
        pobAmount: 0,
        remarks: "",
      },
    ]);
  };

  const handleRemoveCallRow = (index: number) => {
    if (callLogs.length === 1) return;
    setCallLogs(callLogs.filter((_, i) => i !== index));
  };

  const handleCallChange = (index: number, field: keyof CallEntry, value: any) => {
    const updated = [...callLogs];
    updated[index] = { ...updated[index], [field]: value };
    setFormCallLogs(updated);
  };

  const setFormCallLogs = (updated: CallEntry[]) => {
    setCallLogs(updated);
  };

  const handleSubmitDcr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dcrHeader.dcrDate || !dcrHeader.areaVisited) {
      setError("DCR Date and Area Visited are required.");
      return;
    }

    // Validate calls
    const invalidCall = callLogs.find((c) => !c.partyName.trim());
    if (invalidCall) {
      setError("Please fill Doctor / Chemist name for all call entries.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...dcrHeader,
        calls: callLogs.map((c) => ({
          callType: c.callType,
          partyName: c.partyName,
          speciality: c.speciality,
          visitShift: c.visitShift,
          visitedWith: c.visitedWith,
          pobAmount: Number(c.pobAmount || 0),
          remarks: c.remarks,
          productsPromoted: c.productName
            ? [{ productName: c.productName, sampleQty: Number(c.sampleQty || 0) }]
            : [],
        })),
      };

      const res = await fetch("/api/mr-reporting/dcr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess("Daily Call Report (DCR) submitted successfully!");
        fetchDcrs();
        setActiveTab("history");
      } else {
        setError(json.message || "Failed to submit DCR.");
      }
    } catch {
      setError("An error occurred while submitting DCR.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDrawer = async (id: string) => {
    try {
      const res = await fetch(`/api/mr-reporting/dcr/${id}`);
      const json = await res.json();
      if (json.success) {
        setSelectedDcrDrawer(json.data);
      }
    } catch {
      console.error("Failed to load DCR details");
    }
  };

  const handleOpenApprovalModal = (dcr: DcrItem) => {
    setApprovingDcrId(dcr._id);
    setApprovalStatusInput("Approved");
    setApprovalRemarksInput("");
  };

  const handleExecuteApproval = async () => {
    if (!approvingDcrId) return;
    try {
      const res = await fetch(`/api/mr-reporting/dcr/${approvingDcrId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStatus: approvalStatusInput,
          approvalRemarks: approvalRemarksInput,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(`DCR status updated to ${approvalStatusInput}.`);
        setApprovingDcrId(null);
        fetchDcrs();
      } else {
        setError(json.message || "Failed to update approval status.");
      }
    } catch {
      setError("Failed to update status.");
    }
  };

  const filteredDcrs = useMemo(() => {
    return dcrs.filter((d) => {
      const s = search.toLowerCase();
      const matchSearch =
        !search ||
        d.userName.toLowerCase().includes(s) ||
        (d.employeeCode && d.employeeCode.toLowerCase().includes(s)) ||
        (d.areaVisited && d.areaVisited.toLowerCase().includes(s)) ||
        (d.workType && d.workType.toLowerCase().includes(s));
      const matchStatus = !statusFilter || d.approvalStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [dcrs, search, statusFilter]);

  const metrics = useMemo(() => {
    const total = dcrs.length;
    const approved = dcrs.filter((d) => d.approvalStatus === "Approved").length;
    const pending = dcrs.filter((d) => d.approvalStatus === "Pending").length;
    const doctorCalls = dcrs.reduce((acc, d) => acc + (d.totalDoctorCalls || 0), 0);
    const chemistCalls = dcrs.reduce((acc, d) => acc + (d.totalChemistCalls || 0), 0);
    const pobSum = dcrs.reduce((acc, d) => acc + (d.totalPobAmount || 0), 0);

    return { total, approved, pending, doctorCalls, chemistCalls, pobSum };
  }, [dcrs]);

  const moneyFormat = (v: number) => `₹ ${Number(v || 0).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6 p-4">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/20 backdrop-blur-md border border-white/30">
                Pharma MR Operations
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                Daily Call Reporting & POB Booking
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Full MR Daily Call Report (DCR)</h1>
            <p className="text-xs text-white/80 mt-1">
              Field work logs, doctor visits, sample distribution, POB order bookings & manager approvals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "history"
                  ? "bg-white text-emerald-950 shadow-md scale-105"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              DCR History & Approvals
            </button>
            <button
              onClick={() => setActiveTab("new")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "new"
                  ? "bg-white text-emerald-950 shadow-md scale-105"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <FaPlus /> Submit DCR
            </button>
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

      {/* KPI METRICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500">Total DCRs</p>
          <p className="text-xl font-extrabold text-slate-800 mt-1">{metrics.total}</p>
        </div>
        <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-600">Approved DCRs</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{metrics.approved}</p>
        </div>
        <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-amber-600">Pending Approvals</p>
          <p className="text-xl font-extrabold text-amber-700 mt-1">{metrics.pending}</p>
        </div>
        <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-indigo-600">Doctor Visits</p>
          <p className="text-xl font-extrabold text-indigo-700 mt-1">{metrics.doctorCalls}</p>
        </div>
        <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-teal-600">Chemist Visits</p>
          <p className="text-xl font-extrabold text-teal-700 mt-1">{metrics.chemistCalls}</p>
        </div>
        <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-purple-600">POB Booked</p>
          <p className="text-lg font-extrabold text-purple-700 mt-1">{moneyFormat(metrics.pobSum)}</p>
        </div>
      </div>

      {/* TAB 1: DCR HISTORY & APPROVALS */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-72">
              <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search MR name, area, work type..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 font-semibold focus:outline-none"
              >
                <option value="">All Statuses (Pending / Approved / Rejected)</option>
                <option value="Pending">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* DCR Table */}
          {loading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-500">Loading DCR history...</div>
          ) : filteredDcrs.length === 0 ? (
            <div className="p-12 text-center bg-white/50 backdrop-blur-md rounded-2xl border border-dashed border-slate-300">
              <p className="text-xs font-semibold text-slate-600">No DCR records found.</p>
              <button
                onClick={() => setActiveTab("new")}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
              >
                <FaPlus size={10} /> Submit First DCR
              </button>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">M.R. Name</th>
                      <th className="px-4 py-3">Work Type</th>
                      <th className="px-4 py-3">Station</th>
                      <th className="px-4 py-3">Area Visited</th>
                      <th className="px-4 py-3 text-center">Doctor Calls</th>
                      <th className="px-4 py-3 text-center">Chemist Calls</th>
                      <th className="px-4 py-3 text-right">POB Booked</th>
                      <th className="px-4 py-3 text-center">Approval Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDcrs.map((d) => (
                      <tr key={d._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {new Date(d.dcrDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 font-bold text-indigo-950">
                          {d.userName}
                          {d.employeeCode && <span className="block text-[10px] font-normal text-slate-400">({d.employeeCode})</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {d.workType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-600">{d.stationType}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{d.areaVisited}</td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-700">{d.totalDoctorCalls}</td>
                        <td className="px-4 py-3 text-center font-bold text-teal-700">{d.totalChemistCalls}</td>
                        <td className="px-4 py-3 text-right font-bold text-purple-700">{moneyFormat(d.totalPobAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              d.approvalStatus === "Approved"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : d.approvalStatus === "Rejected"
                                ? "bg-rose-100 text-rose-800 border-rose-200"
                                : "bg-amber-100 text-amber-800 border-amber-200"
                            }`}
                          >
                            {d.approvalStatus === "Approved" && <FaCheckCircle size={10} />}
                            {d.approvalStatus === "Rejected" && <FaTimesCircle size={10} />}
                            {d.approvalStatus === "Pending" && <FaClock size={10} />}
                            {d.approvalStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenDrawer(d._id)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 flex items-center gap-1"
                            >
                              <FaEye size={11} /> View
                            </button>
                            {d.approvalStatus === "Pending" && (
                              <button
                                onClick={() => handleOpenApprovalModal(d)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMIT NEW DCR FORM */}
      {activeTab === "new" && (
        <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Submit Daily Call Report (DCR)</h3>
              <p className="text-xs text-slate-500">Log doctor visits, chemist meetings, samples, and POB orders for today.</p>
            </div>
            <button
              onClick={() => setActiveTab("history")}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <FaArrowLeft /> Back to List
            </button>
          </div>

          <form onSubmit={handleSubmitDcr} className="space-y-6">
            {/* DCR Header Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">DCR Date *</label>
                <input
                  type="date"
                  value={dcrHeader.dcrDate}
                  onChange={(e) => setDcrHeader({ ...dcrHeader, dcrDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Work Type</label>
                <select
                  value={dcrHeader.workType}
                  onChange={(e) => setDcrHeader({ ...dcrHeader, workType: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold outline-none"
                >
                  <option value="Field Work">Field Work</option>
                  <option value="Office Work">Office Work</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Conference">Conference</option>
                  <option value="Leave">Leave</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Station Type</label>
                <select
                  value={dcrHeader.stationType}
                  onChange={(e) => setDcrHeader({ ...dcrHeader, stationType: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold outline-none"
                >
                  <option value="HQ">HQ (Headquarter)</option>
                  <option value="EX">EX (Ex-Station)</option>
                  <option value="OS">OS (Out-Station)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Area / Beat Visited *</label>
                <input
                  type="text"
                  value={dcrHeader.areaVisited}
                  onChange={(e) => setDcrHeader({ ...dcrHeader, areaVisited: e.target.value })}
                  placeholder="e.g. Hazratganj / Chowk"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none"
                  required
                />
              </div>
            </div>

            {/* CALL LOGS SECTION */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Doctor & Chemist Call Logs ({callLogs.length})</h4>
                <button
                  type="button"
                  onClick={handleAddCallRow}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-emerald-700"
                >
                  <FaPlus size={10} /> Add Call Entry
                </button>
              </div>

              <div className="space-y-3">
                {callLogs.map((call, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm relative space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-indigo-900">Call Entry #{idx + 1}</span>
                      {callLogs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCallRow(idx)}
                          className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1"
                        >
                          <FaTrashAlt size={11} /> Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Call Type</label>
                        <select
                          value={call.callType}
                          onChange={(e) => handleCallChange(idx, "callType", e.target.value as any)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none"
                        >
                          <option value="Doctor">Doctor Visit</option>
                          <option value="Chemist">Chemist Visit</option>
                          <option value="Stockist">Stockist Visit</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Doctor / Party Name *</label>
                        <input
                          type="text"
                          value={call.partyName}
                          onChange={(e) => handleCallChange(idx, "partyName", e.target.value)}
                          placeholder="e.g. Dr. A. K. Gupta"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Speciality / Qualification</label>
                        <input
                          type="text"
                          value={call.speciality}
                          onChange={(e) => handleCallChange(idx, "speciality", e.target.value)}
                          placeholder="e.g. MBBS, MD, Cardio"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Visited With</label>
                        <select
                          value={call.visitedWith}
                          onChange={(e) => handleCallChange(idx, "visitedWith", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none"
                        >
                          <option value="Self">Self (Independent)</option>
                          <option value="ASM">With ASM</option>
                          <option value="ZSM">With ZSM</option>
                          <option value="RSM">With RSM</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Product Promoted</label>
                        <input
                          type="text"
                          value={call.productName}
                          onChange={(e) => handleCallChange(idx, "productName", e.target.value)}
                          placeholder="e.g. Paracetamol 650"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Sample Qty Given</label>
                        <input
                          type="number"
                          value={call.sampleQty}
                          onChange={(e) => handleCallChange(idx, "sampleQty", Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">POB Booked Amount (₹)</label>
                        <input
                          type="number"
                          value={call.pobAmount}
                          onChange={(e) => handleCallChange(idx, "pobAmount", Number(e.target.value))}
                          placeholder="e.g. 5000"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none font-bold text-purple-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Doctor Remarks / Feedback</label>
                        <input
                          type="text"
                          value={call.remarks}
                          onChange={(e) => handleCallChange(idx, "remarks", e.target.value)}
                          placeholder="Feedback or order promise"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md flex items-center gap-1.5"
              >
                <FaSave /> {submitting ? "Submitting DCR..." : "Submit DCR Report"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DCR QUICK DETAILS MODAL POPUP */}
      {selectedDcrDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setSelectedDcrDrawer(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-[scaleUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <div>
                <h3 className="text-base font-bold text-slate-900">DCR Call Details & Activity Log</h3>
                <p className="text-xs text-slate-500">M.R.: <span className="font-semibold text-slate-700">{selectedDcrDrawer.userName}</span> {selectedDcrDrawer.employeeCode ? `(${selectedDcrDrawer.employeeCode})` : ""}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDcrDrawer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-medium">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">DCR Date</span>
                  <span className="text-slate-800 font-bold">{new Date(selectedDcrDrawer.dcrDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Work Type</span>
                  <span className="text-slate-800 font-bold">{selectedDcrDrawer.workType}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Station</span>
                  <span className="text-slate-800 font-bold">{selectedDcrDrawer.stationType}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Area Visited</span>
                  <span className="text-slate-800 font-bold">{selectedDcrDrawer.areaVisited}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <h4 className="font-extrabold text-slate-800 text-xs tracking-tight">
                  Doctor & Chemist Visit Logs ({selectedDcrDrawer.calls?.length || 0})
                </h4>
                {selectedDcrDrawer.totalPobAmount > 0 && (
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                    Total POB: {moneyFormat(selectedDcrDrawer.totalPobAmount)}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {selectedDcrDrawer.calls?.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No detailed call logs attached to this DCR.</p>
                ) : (
                  selectedDcrDrawer.calls?.map((c: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-950 text-xs">{c.partyName} ({c.callType})</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {c.speciality || "GP"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">Shift: <span className="font-semibold">{c.visitShift}</span> | Visited With: <span className="font-semibold">{c.visitedWith}</span></p>
                      {c.productsPromoted?.length > 0 && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                          <span className="font-bold text-slate-700">Promoted: </span>
                          {c.productsPromoted.map((p: any) => `${p.productName} (Qty: ${p.sampleQty || 0})`).join(", ")}
                        </div>
                      )}
                      {c.pobAmount > 0 && <p className="text-xs font-bold text-purple-700">POB Amount: {moneyFormat(c.pobAmount)}</p>}
                      {c.remarks && <p className="text-[11px] text-slate-500 italic">"{c.remarks}"</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDcrDrawer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* APPROVAL MODAL */}
      {approvingDcrId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Manager DCR Approval</h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Approval Decision</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setApprovalStatusInput("Approved")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    approvalStatusInput === "Approved" ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-700"
                  }`}
                >
                  Approve DCR
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalStatusInput("Rejected")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    approvalStatusInput === "Rejected" ? "bg-rose-600 text-white border-rose-600" : "bg-slate-50 text-slate-700"
                  }`}
                >
                  Reject DCR
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Manager Remarks / Feedback</label>
              <textarea
                value={approvalRemarksInput}
                onChange={(e) => setApprovalRemarksInput(e.target.value)}
                placeholder="Remarks for the MR..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setApprovingDcrId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteApproval}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
