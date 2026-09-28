"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import { FaBuilding, FaSearch, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
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

const columnHelper = createColumnHelper<ICompanyListItem>();

export default function CompanyListPage() {
  const [companies, setCompanies] = useState<ICompanyListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const isAdmin = currentUserRole === ROLE_TYPE.ADMIN || currentUserRole === ROLE_TYPE.SUPER_ADMIN;

  // Load current user role and their scoped companies
  const loadAll = async () => {
    try {
      setLoading(true);

      // Get current user role (for action visibility)
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData?.user?.roleType) {
        setCurrentUserRole(meData.user.roleType);
      }

      // Company list is already scoped server-side by tenantId / role
      const res = await fetch("/api/company-master");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCompanies(data);
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
  }, []);

  const deleteCompany = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company? This action cannot be undone.")) return;
    try {
      await fetch(`/api/company-master/${id}`, { method: "DELETE" });
      loadAll();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("companyCode", {
        header: "Code",
        cell: (info) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("companyName", {
        header: "Company / Enterprise",
        cell: (info) => (
          <div>
            <span className="font-extrabold text-slate-900 block text-xs sm:text-sm">
              {info.getValue() || "—"}
            </span>
            {info.row.original.gstNo && (
              <span className="text-[10.5px] font-mono text-slate-400">
                GST: {info.row.original.gstNo}
              </span>
            )}
          </div>
        ),
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
      // Only show action buttons for Admin / SuperAdmin users
      ...(isAdmin
        ? [
            columnHelper.display({
              id: "actions",
              header: "Actions",
              cell: (info) => (
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/dashboard/company/edit/${info.row.original._id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <FaEdit size={11} />
                    Edit
                  </Link>
                  <button
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                    onClick={() => deleteCompany(info.row.original._id)}
                  >
                    <FaTrash size={11} />
                    Delete
                  </button>
                </div>
              ),
            }),
          ]
        : []),
    ],
    [isAdmin]
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
      return (
        !!c.companyCode?.toLowerCase().includes(q) ||
        !!c.companyName?.toLowerCase().includes(q) ||
        !!c.ownerName?.toLowerCase().includes(q) ||
        !!c.email?.toLowerCase().includes(q) ||
        !!c.mobile?.toLowerCase().includes(q) ||
        !!c.gstNo?.toLowerCase().includes(q) ||
        !!c.city?.toLowerCase().includes(q)
      );
    },
  });

  return (
    <ProtectedPage permission="company.view">
      <div className="max-w-6xl mx-auto space-y-5 pb-16">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600">
              <FaBuilding size={16} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight m-0">
                Company &amp; Enterprise Directory
              </h1>
              <p className="text-xs text-slate-500 font-medium m-0">
                {isAdmin
                  ? "Showing all companies in your workspace."
                  : "Showing your registered enterprise."}
              </p>
            </div>
          </div>

          {/* Only admins can create new companies */}
          {isAdmin && (
            <Link
              href="/dashboard/company/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <FaPlus size={10} />
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
                placeholder="Search by company, code, GSTIN, owner or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {table.getFilteredRowModel().rows.length} of {companies.length} companies
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
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-xs text-slate-400 font-semibold">
                      Loading company directory...
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-xs text-slate-400 font-semibold">
                      No companies found.{isAdmin && " Click \"Add Company\" to register one."}
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
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