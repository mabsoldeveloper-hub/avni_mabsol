"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  FaCodeBranch,
  FaSync,
  FaBuilding,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaClock,
  FaBan,
  FaSearch,
  FaChevronDown,
  FaChevronRight,
  FaChevronUp,
  FaEnvelope,
  FaPhone,
  FaShieldAlt,
  FaBoxes,
  FaEye,
  FaFilter,
  FaTimes,
} from "react-icons/fa";

interface ChildBranch {
  _id: string;
  companyName: string;
  companyCode: string;
  tenantId?: string;
  gstNo?: string;
  city?: string;
  state?: string;
  address?: string;
  email?: string;
  mobile?: string;
  status: string;
  enabledModules?: string[];
  adminUser?: {
    _id?: string;
    name?: string;
    email?: string;
    mobile?: string;
    isApproved?: boolean;
    status?: string;
  } | null;
  createdAt?: string;
}

interface HeadOfficeNetwork {
  _id: string;
  companyName: string;
  companyCode: string;
  tenantId?: string;
  gstNo?: string;
  city?: string;
  state?: string;
  address?: string;
  email?: string;
  mobile?: string;
  status: string;
  enabledModules?: string[];
  branchCount: number;
  branches: ChildBranch[];
  adminUser?: {
    _id?: string;
    name?: string;
    email?: string;
    mobile?: string;
    isApproved?: boolean;
    status?: string;
  } | null;
  createdAt?: string;
}

interface BranchStats {
  totalHeadOffices: number;
  totalChildBranches: number;
  totalEnterpriseNodes: number;
  activeBranches: number;
  pendingBranches: number;
  suspendedBranches: number;
}

function BranchManagementContent() {
  const [networks, setNetworks] = useState<HeadOfficeNetwork[]>([]);
  const [allHeadOffices, setAllHeadOffices] = useState<any[]>([]);
  const [stats, setStats] = useState<BranchStats>({
    totalHeadOffices: 0,
    totalChildBranches: 0,
    totalEnterpriseNodes: 0,
    activeBranches: 0,
    pendingBranches: 0,
    suspendedBranches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedHO, setSelectedHO] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Expanded Head Offices
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedHO !== "all") params.append("headOfficeId", selectedHO);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/super-admin/branches?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setNetworks(data.branchNetworks || []);
        if (data.allHeadOffices) setAllHeadOffices(data.allHeadOffices);
        if (data.stats) setStats(data.stats);

        // Auto-expand all head offices that have child branches
        const initialExpanded: Record<string, boolean> = {};
        (data.branchNetworks || []).forEach((n: HeadOfficeNetwork) => {
          if (n.branchCount > 0) {
            initialExpanded[n._id] = true;
          }
        });
        setExpandedNodes((prev) => (Object.keys(prev).length === 0 ? initialExpanded : prev));
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedHO, statusFilter]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleUpdateBranchStatus = async (
    companyId: string,
    newStatus: "Active" | "Suspended" | "Pending"
  ) => {
    setActionLoading(companyId);
    try {
      const res = await fetch("/api/super-admin/branches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchBranches();
      } else {
        alert(data.message || "Failed to update branch status");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error updating branch status");
    } finally {
      setActionLoading(null);
    }
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    networks.forEach((n) => {
      next[n._id] = true;
    });
    setExpandedNodes(next);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const activePct =
    stats.totalEnterpriseNodes > 0
      ? Math.round((stats.activeBranches / stats.totalEnterpriseNodes) * 100)
      : 100;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 text-slate-800">
      {/* Executive Command Header */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white flex items-center justify-center text-lg shadow-sm shadow-indigo-600/25 shrink-0">
            <FaCodeBranch />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Multi-Branch Network Management
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <FaCodeBranch size={10} />
                {stats.totalEnterpriseNodes} Total Network Nodes
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Hierarchical overview of Head Office enterprises, connected child branches, and regional operational nodes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={expandAll}
            className="px-3.5 py-2 rounded-xl bg-slate-50/70 hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3.5 py-2 rounded-xl bg-slate-50/70 hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Collapse All
          </button>
          <button
            type="button"
            onClick={fetchBranches}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
            title="Refresh network"
          >
            <FaSync className={`text-xs ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4 Luxury KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: TOTAL HEAD OFFICES */}
        <div className="relative group overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-90 group-hover:h-1.5 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Head Offices (Hubs)
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm border border-indigo-100 group-hover:scale-105 transition-transform">
              <FaBuilding />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">
              {stats.totalHeadOffices}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
              <span>Primary enterprise licenses</span>
            </div>
          </div>
        </div>

        {/* Card 2: CONNECTED CHILD BRANCHES */}
        <div className="relative group overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-90 group-hover:h-1.5 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Child Branches
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-sm border border-teal-100 group-hover:scale-105 transition-transform">
              <FaCodeBranch />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">
              {stats.totalChildBranches}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-teal-700 font-semibold flex items-center gap-1">
              <span>Regional operating units</span>
            </div>
          </div>
        </div>

        {/* Card 3: OPERATIONAL COVERAGE */}
        <div className="relative group overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-90 group-hover:h-1.5 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Active Network Nodes
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm border border-emerald-100 group-hover:scale-105 transition-transform">
              <FaCheckCircle />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">
                {stats.activeBranches}
              </span>
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                {activePct}% Active
              </span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-emerald-700 font-semibold">
              Live & synchronized
            </div>
          </div>
        </div>

        {/* Card 4: RESTRICTED / PENDING */}
        <div className="relative group overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-90 group-hover:h-1.5 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Pending / Suspended
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm border border-amber-100 group-hover:scale-105 transition-transform">
              <FaClock />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-black text-slate-900 tracking-tight leading-none font-mono">
                {stats.pendingBranches + stats.suspendedBranches}
              </span>
              <span className="text-[10.5px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80">
                {stats.suspendedBranches} Suspended
              </span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-amber-700 font-semibold">
              Requires clearance review
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="Search branch name, CRM code (e.g. MABS148, EROS568), GSTIN, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-full bg-slate-50/60 hover:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Head Office Selector */}
        <div className="relative min-w-[180px] max-w-[280px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <FaBuilding size={11} />
          </div>
          <select
            value={selectedHO}
            onChange={(e) => setSelectedHO(e.target.value)}
            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold pl-8 pr-8 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs truncate"
          >
            <option value="all">All Head Offices</option>
            {allHeadOffices.map((ho) => (
              <option key={ho._id} value={ho._id}>
                {ho.companyName} {ho.companyCode ? `(${ho.companyCode})` : ""}
              </option>
            ))}
          </select>
          <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative min-w-[130px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold pl-4 pr-8 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Suspended">Suspended</option>
          </select>
          <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
        </div>
      </div>

      {/* Network Directory: Grouped Hierarchically by Head Office */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-14 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
            <FaSync className="animate-spin text-xl text-indigo-600" />
            <p className="text-xs font-semibold text-slate-600">Retrieving branch hierarchy...</p>
          </div>
        ) : networks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-14 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl mb-1">
              <FaCodeBranch />
            </div>
            <p className="text-sm font-bold text-slate-800">No Branch Networks Found</p>
            <p className="text-xs text-slate-400 max-w-sm">
              No Head Office or connected child branches match your filter criteria.
            </p>
          </div>
        ) : (
          networks.map((ho) => {
            const isExpanded = !!expandedNodes[ho._id];
            const hoInitials = ho.companyName
              .split(" ")
              .map((w: string) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase() || "HO";

            const isHoActive = ho.status === "Active";

            return (
              <div
                key={ho._id}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* HEAD OFFICE CARD HEADER */}
                <div className="p-3.5 sm:p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleExpand(ho._id)}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer shrink-0 mt-0.5"
                      title={isExpanded ? "Collapse child branches" : "Expand child branches"}
                    >
                      {isExpanded ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
                    </button>

                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {hoInitials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <h2 className="font-extrabold text-slate-900 text-sm tracking-tight">
                          {ho.companyName}
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <FaBuilding size={8} />
                          <span>HEAD OFFICE</span>
                        </span>
                        {ho.companyCode && (
                          <span className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {ho.companyCode}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isHoActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {ho.status || "Active"}
                        </span>
                      </div>

                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        {ho.gstNo && (
                          <span className="font-mono text-[11px] text-slate-600">
                            GSTIN: <strong>{ho.gstNo}</strong>
                          </span>
                        )}
                        {(ho.city || ho.state) && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-600">
                            <FaMapMarkerAlt size={10} className="text-slate-400" />
                            <span>{[ho.city, ho.state].filter(Boolean).join(", ")}</span>
                          </span>
                        )}
                        {ho.adminUser && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-600">
                            <FaEnvelope size={10} className="text-slate-400" />
                            <span>{ho.adminUser.email}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Header Summary */}
                  <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0 pl-11 lg:pl-0">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                        ho.branchCount > 0
                          ? "bg-teal-50 text-teal-800 border-teal-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {ho.branchCount} {ho.branchCount === 1 ? "Child Branch" : "Child Branches"}
                    </span>

                    {ho.adminUser?._id && (
                      <Link
                        href={`/dashboard/super-admin/approvals/${ho.adminUser._id}`}
                        className="px-3 py-1.5 rounded-full bg-white hover:bg-blue-50 border border-slate-200 text-blue-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                      >
                        <FaEye size={10} />
                        <span>Manage Hub</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* EXPANDED CHILD BRANCHES TABLE */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 bg-white">
                    {ho.branches.length === 0 ? (
                      <div className="py-6 px-4 rounded-xl bg-slate-50/70 border border-slate-100 text-center">
                        <p className="text-xs font-bold text-slate-600">No Child Branches Registered</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          This enterprise currently operates as a standalone primary organization.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200/70">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase text-[9.5px] font-bold tracking-wider">
                              <th className="py-2.5 px-3">BRANCH NAME & CODE</th>
                              <th className="py-2.5 px-3">LOCATION</th>
                              <th className="py-2.5 px-3">GSTIN</th>
                              <th className="py-2.5 px-3">CONTACT EMAIL</th>
                              <th className="py-2.5 px-3 text-center">MODULES</th>
                              <th className="py-2.5 px-3">STATUS</th>
                              <th className="py-2.5 px-3 text-center">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ho.branches.map((b) => {
                              const bInitials = b.companyName
                                .split(" ")
                                .map((w: string) => w[0])
                                .filter(Boolean)
                                .slice(0, 2)
                                .join("")
                                .toUpperCase() || "BR";

                              const isBranchActive = b.status === "Active";
                              const modCount = b.enabledModules ? b.enabledModules.length : 0;

                              return (
                                <tr key={b._id} className="hover:bg-slate-50/60 transition-colors">
                                  {/* Branch Name & Code */}
                                  <td className="py-3 px-3 align-middle">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-teal-200">
                                        {bInitials}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900 text-xs">
                                          {b.companyName}
                                        </div>
                                        <div className="font-mono text-[10px] text-teal-700 font-bold mt-0.5">
                                          CODE: {b.companyCode}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Location */}
                                  <td className="py-3 px-3 align-middle text-slate-600">
                                    <div className="flex items-center gap-1 text-xs">
                                      <FaMapMarkerAlt size={9} className="text-slate-400" />
                                      <span>{[b.city, b.state].filter(Boolean).join(", ") || "Unassigned"}</span>
                                    </div>
                                  </td>

                                  {/* GSTIN */}
                                  <td className="py-3 px-3 align-middle font-mono text-[11px] text-slate-700">
                                    {b.gstNo || "N/A"}
                                  </td>

                                  {/* Contact Email */}
                                  <td className="py-3 px-3 align-middle text-slate-600">
                                    <div className="text-xs truncate max-w-[180px]">
                                      {b.email || b.adminUser?.email || "N/A"}
                                    </div>
                                    {b.mobile && (
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        {b.mobile}
                                      </div>
                                    )}
                                  </td>

                                  {/* Modules Count */}
                                  <td className="py-3 px-3 align-middle text-center">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10.5px] font-bold">
                                      {modCount} Active
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td className="py-3 px-3 align-middle">
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                                        isBranchActive
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : b.status === "Suspended"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      {isBranchActive ? (
                                        <FaCheckCircle size={8} />
                                      ) : b.status === "Suspended" ? (
                                        <FaBan size={8} />
                                      ) : (
                                        <FaClock size={8} />
                                      )}
                                      <span>{b.status || "Active"}</span>
                                    </span>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3 px-3 align-middle text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {isBranchActive ? (
                                        <button
                                          type="button"
                                          disabled={actionLoading === b._id}
                                          onClick={() => handleUpdateBranchStatus(b._id, "Suspended")}
                                          className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-[10.5px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                        >
                                          Suspend
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={actionLoading === b._id}
                                          onClick={() => handleUpdateBranchStatus(b._id, "Active")}
                                          className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 text-[10.5px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                        >
                                          Activate
                                        </button>
                                      )}

                                      {b.adminUser?._id && (
                                        <Link
                                          href={`/dashboard/super-admin/approvals/${b.adminUser._id}`}
                                          className="px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 text-[10.5px] font-bold transition-all"
                                          title="Configure branch permissions"
                                        >
                                          Configure
                                        </Link>
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
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function BranchManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <FaSync className="animate-spin text-indigo-600" />
            Loading multi-branch network...
          </div>
        </div>
      }
    >
      <BranchManagementContent />
    </Suspense>
  );
}
