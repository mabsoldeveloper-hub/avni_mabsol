"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import {
  FaBuilding,
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCodeBranch,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { ROLE_TYPE } from "@/lib/constants/roles.constant";
import type { ICompanyListItem } from "@/types/company.types";
import { useCompany } from "@/context/CompanyContext";

const columnHelper = createColumnHelper<ICompanyListItem>();

export default function CompanyListPage() {
  const { selectedCompany } = useCompany();
  const [companies, setCompanies] = useState<ICompanyListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const isAdmin = currentUserRole === ROLE_TYPE.ADMIN || currentUserRole === ROLE_TYPE.SUPER_ADMIN;
  const isChildBranchActive = Boolean(
    selectedCompany && (selectedCompany.isHeadOffice === false || selectedCompany.parentCompanyId)
  );

  const toggleExpand = (companyId: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [companyId]: !prev[companyId],
    }));
  };

  // Load current user role and scoped companies
  const loadAll = async () => {
    try {
      setLoading(true);

      // Get current user role (for action visibility)
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData?.user?.roleType) {
        setCurrentUserRole(meData.user.roleType);
      }

      // Company list scoped by activeCompanyId
      const url = selectedCompany?._id
        ? `/api/company-master?activeCompanyId=${encodeURIComponent(selectedCompany._id)}`
        : "/api/company-master";

      const res = await fetch(url, {
        headers: {
          "x-company-id": selectedCompany?._id || "",
        },
      });
      const data = await res.json();

      if (Array.isArray(data)) {
        // Strict child branch isolation safeguard: Child company can ONLY see itself
        if (isChildBranchActive && selectedCompany) {
          setCompanies(data.filter((c: any) => String(c._id) === String(selectedCompany._id)));
        } else {
          // Hierarchy organization:
          // Child branches should NOT appear as standalone top-level rows.
          // They must be grouped and displayed nested inside their parent Head Office.
          const isChild = (c: any) => Boolean(c.parentCompanyId && c.isHeadOffice !== true);
          const childMap = new Map<string, ICompanyListItem[]>();

          data.forEach((c: any) => {
            if (isChild(c) && c.parentCompanyId) {
              const pid = String(
                typeof c.parentCompanyId === "object" ? c.parentCompanyId._id : c.parentCompanyId
              );
              const list = childMap.get(pid) || [];
              list.push(c);
              childMap.set(pid, list);
            }
          });

          const topLevel: ICompanyListItem[] = [];
          const initialExpanded: Record<string, boolean> = {};

          data.forEach((c: any) => {
            const pid = c.parentCompanyId
              ? String(typeof c.parentCompanyId === "object" ? c.parentCompanyId._id : c.parentCompanyId)
              : null;

            if (!isChild(c)) {
              // Top-level Head Office or independent enterprise
              const branches = childMap.get(String(c._id)) || [];
              topLevel.push({
                ...c,
                branches,
              });
              if (branches.length > 0) {
                initialExpanded[c._id] = true;
              }
            } else if (pid && !data.some((parent: any) => String(parent._id) === pid)) {
              // Orphan child branch whose parent wasn't returned in the scoped query:
              // Fallback to top-level so it doesn't vanish
              topLevel.push({
                ...c,
                branches: [],
              });
            }
          });

          setCompanies(topLevel);
          setExpandedIds((prev) => ({ ...initialExpanded, ...prev }));
        }
      } else {
        setCompanies([]);
      }
    } catch (error) {
      console.error("Failed to load companies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [selectedCompany?._id, isChildBranchActive]);

  const deleteCompany = async (id: string) => {
    if (isChildBranchActive) {
      alert("Branch companies are not authorized to delete companies.");
      return;
    }
    if (!confirm("Are you sure you want to delete this company? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/company-master/${id}`, {
        method: "DELETE",
        headers: {
          "x-company-id": selectedCompany?._id || "",
        },
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "Failed to delete company");
        return;
      }
      loadAll();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("companyCode", {
        header: "Code",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col gap-1 items-start">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                {info.getValue() || "—"}
              </span>
              {row.isHeadOffice ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                  Head Office
                </span>
              ) : row.parentCompanyId ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wider">
                  Child Branch
                </span>
              ) : null}
            </div>
          );
        },
      }),
      columnHelper.accessor("companyName", {
        header: "Company / Enterprise",
        cell: (info) => {
          const row = info.row.original;
          const branches = row.branches || [];
          const isExpanded = Boolean(expandedIds[row._id]);

          return (
            <div>
              <span className="font-extrabold text-slate-900 block text-xs sm:text-sm">
                {info.getValue() || "—"}
              </span>
              {row.gstNo && (
                <span className="text-[10.5px] font-mono text-slate-400 block mt-0.5">
                  GST: {row.gstNo}
                </span>
              )}
              {branches.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleExpand(row._id)}
                  className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer"
                >
                  <FaCodeBranch size={10} className="text-indigo-600" />
                  <span>
                    {branches.length} {branches.length === 1 ? "Connected Branch" : "Connected Branches"}
                  </span>
                  {isExpanded ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
                </button>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("ownerName", {
        header: "Owner / Director",
        cell: (info) => (
          <span className="text-xs font-medium text-slate-700">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("city", {
        header: "Location",
        cell: (info) => {
          const city = info.row.original.city;
          const state = info.row.original.state;
          const loc = [city, state].filter(Boolean).join(", ");
          return <span className="text-xs text-slate-600 font-medium">{loc || "—"}</span>;
        },
      }),
      columnHelper.accessor("mobile", {
        header: "Contact",
        cell: (info) => {
          const mob = info.row.original.mobile;
          const email = info.row.original.email;
          return (
            <div className="text-[11.5px] text-slate-600">
              {mob && <div className="font-semibold text-slate-800">{mob}</div>}
              {email && <div className="text-slate-400 truncate max-w-[150px]">{email}</div>}
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) =>
          info.getValue() === "Active" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              {info.getValue() || "Inactive"}
            </span>
          ),
      }),
      // Action buttons for Admin / SuperAdmin users
      ...(isAdmin
        ? [
            columnHelper.display({
              id: "actions",
              header: "Actions",
              cell: (info) => {
                const row = info.row.original;
                const canDelete =
                  !isChildBranchActive &&
                  !row.isHeadOffice &&
                  String(row._id) !== String(selectedCompany?._id);

                return (
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/dashboard/company/edit/${row._id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <FaEdit size={11} />
                      Edit
                    </Link>
                    {canDelete && (
                      <button
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                        onClick={() => deleteCompany(row._id)}
                      >
                        <FaTrash size={11} />
                        Delete
                      </button>
                    )}
                  </div>
                );
              },
            }),
          ]
        : []),
    ],
    [isAdmin, isChildBranchActive, selectedCompany?._id, expandedIds]
  );

  const table = useReactTable({
    data: companies,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase();
      const c = row.original;
      const matchesParent =
        !!c.companyCode?.toLowerCase().includes(q) ||
        !!c.companyName?.toLowerCase().includes(q) ||
        !!c.ownerName?.toLowerCase().includes(q) ||
        !!c.email?.toLowerCase().includes(q) ||
        !!c.mobile?.toLowerCase().includes(q) ||
        !!c.gstNo?.toLowerCase().includes(q) ||
        !!c.city?.toLowerCase().includes(q);

      const matchesBranch = c.branches?.some(
        (b: any) =>
          !!b.companyCode?.toLowerCase().includes(q) ||
          !!b.companyName?.toLowerCase().includes(q) ||
          !!b.ownerName?.toLowerCase().includes(q) ||
          !!b.email?.toLowerCase().includes(q) ||
          !!b.mobile?.toLowerCase().includes(q) ||
          !!b.gstNo?.toLowerCase().includes(q) ||
          !!b.city?.toLowerCase().includes(q)
      );

      return Boolean(matchesParent || matchesBranch);
    },
  });

  return (
    <ProtectedPage permission="company.view">
      <div className="max-w-6xl mx-auto space-y-5 pb-16">
        {/* Top Header Card (Compact & Professional) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <FaBuilding size={13} />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight m-0">
                Company &amp; Enterprise Directory
              </h1>
              <p className="text-[11px] text-slate-500 font-normal m-0 mt-0.5">
                {isChildBranchActive
                  ? "Showing enterprise profile for your active branch."
                  : isAdmin
                  ? "Showing all enterprises and connected child branch networks in your workspace."
                  : "Showing your registered enterprise."}
              </p>
            </div>
          </div>

          {/* Only Head Office / workspace admins can create new companies */}
          {isAdmin && !isChildBranchActive && (
            <Link
              href="/dashboard/company/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs whitespace-nowrap cursor-pointer self-start sm:self-auto"
            >
              <FaPlus size={9} />
              Add Company
            </Link>
          )}
        </div>

        {/* Directory Table Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          {/* Search + Filter */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <FaSearch
                size={12}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-[13px] bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all font-medium"
                placeholder="Search by company, branch, code, GSTIN, owner or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {table.getFilteredRowModel().rows.length} of {companies.length} head enterprises
            </span>
          </div>

          {/* Table */}
          <div className="rounded-xl overflow-hidden border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="bg-slate-50 border-b border-slate-200">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-12 text-center text-xs text-slate-400 font-semibold"
                    >
                      Loading company directory...
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-12 text-center text-xs text-slate-400 font-semibold"
                    >
                      No companies found.{isAdmin && ' Click "Add Company" to register one.'}
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => {
                    const branches = row.original.branches || [];
                    const isExpanded = Boolean(expandedIds[row.original._id]);

                    return (
                      <React.Fragment key={row.id}>
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3 align-middle">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>

                        {/* Nested Child Branches row: displayed INSIDE the Head Office */}
                        {isExpanded && branches.length > 0 && (
                          <tr className="bg-gradient-to-r from-indigo-50/40 via-slate-50/60 to-slate-50 border-b border-indigo-100/80">
                            <td colSpan={columns.length} className="px-5 py-4">
                              <div className="ml-2 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-indigo-400 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700">
                                      <FaCodeBranch size={10} />
                                    </span>
                                    <span className="text-xs font-extrabold text-slate-800">
                                      Child Branches Attached to {row.original.companyName}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                      {branches.length} {branches.length === 1 ? "Branch" : "Branches"}
                                    </span>
                                  </div>
                                  {isAdmin && (
                                    <Link
                                      href="/dashboard/company/create"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 transition-colors shadow-2xs"
                                    >
                                      <FaPlus size={8} /> Add Another Branch
                                    </Link>
                                  )}
                                </div>

                                {/* Nested Branch Table */}
                                <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden shadow-2xs">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="bg-slate-50/90 border-b border-slate-200/70 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Branch Code</th>
                                        <th className="px-3 py-2">Branch Name</th>
                                        <th className="px-3 py-2">Location</th>
                                        <th className="px-3 py-2">Contact</th>
                                        <th className="px-3 py-2">Status</th>
                                        {isAdmin && <th className="px-3 py-2 text-right">Actions</th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {branches.map((branch) => (
                                        <tr
                                          key={branch._id}
                                          className="hover:bg-indigo-50/30 transition-colors"
                                        >
                                          <td className="px-3 py-2.5 font-mono font-bold text-indigo-800">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span>{branch.companyCode || "—"}</span>
                                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                                Child Branch
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <div className="font-bold text-slate-900">
                                              {branch.companyName}
                                            </div>
                                            {branch.gstNo && (
                                              <div className="text-[10px] font-mono text-slate-400">
                                                GST: {branch.gstNo}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-3 py-2.5 text-slate-600 font-medium">
                                            {[branch.city, branch.state].filter(Boolean).join(", ") ||
                                              "—"}
                                          </td>
                                          <td className="px-3 py-2.5 text-slate-600">
                                            {branch.mobile && (
                                              <div className="font-semibold text-slate-800">
                                                {branch.mobile}
                                              </div>
                                            )}
                                            {branch.email && (
                                              <div className="text-slate-400 truncate max-w-[140px]">
                                                {branch.email}
                                              </div>
                                            )}
                                            {!branch.mobile && !branch.email && "—"}
                                          </td>
                                          <td className="px-3 py-2.5">
                                            {branch.status === "Active" ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                Active
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                                {branch.status || "Inactive"}
                                              </span>
                                            )}
                                          </td>
                                          {isAdmin && (
                                            <td className="px-3 py-2.5 text-right">
                                              <div className="inline-flex items-center gap-1.5 justify-end">
                                                <Link
                                                  href={`/dashboard/company/edit/${branch._id}`}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                >
                                                  <FaEdit size={10} />
                                                  Edit
                                                </Link>
                                                <button
                                                  onClick={() => deleteCompany(branch._id)}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                                                  title="Delete Branch"
                                                >
                                                  <FaTrash size={10} />
                                                </button>
                                              </div>
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2 text-xs text-slate-500">
              <span>
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </button>
                <button
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
}