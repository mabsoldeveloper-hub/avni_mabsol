"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaUserShield, FaSearch, FaPlus, FaEdit, FaTrash, FaKey } from "react-icons/fa";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

type Role = {
  _id: string;
  roleName?: string;
  description?: string;
  status?: string;
};

const columnHelper = createColumnHelper<Role>();

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/roles");
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const deleteRole = async (id: string) => {
    if (!confirm("Delete this Role?")) return;
    await fetch(`/api/roles/${id}`, { method: "DELETE" });
    alert("Role Deleted");
    loadRoles();
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("roleName", {
        header: "Role Name",
        cell: (info) => (
          <span className="font-medium text-gray-700">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => (
          <span className="text-gray-600">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.display({
        id: "territoryScope",
        header: "Territory / Areas",
        cell: (info) => {
          const areas: string[] = (info.row.original as any).assignedAreaNames || [];
          if (areas.length === 0) {
            return <span className="text-xs text-gray-400 italic">All Areas / Unrestricted</span>;
          }
          return (
            <div className="flex flex-wrap gap-1 max-w-xs">
              {areas.slice(0, 2).map((a, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                  📍 {a}
                </span>
              ))}
              {areas.length > 2 && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                  +{areas.length - 2}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) =>
          info.getValue() === "Active" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 border border-rose-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Inactive
            </span>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/roles/permission/${info.row.original._id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-500/90 hover:bg-indigo-500 transition-colors"
            >
              <FaKey size={11} />
              Permission
            </Link>
            <Link
              href={`/dashboard/roles/edit/${info.row.original._id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-amber-500/90 hover:bg-amber-500 transition-colors"
            >
              <FaEdit size={11} />
              Edit
            </Link>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-500/90 hover:bg-rose-500 transition-colors"
              onClick={() => deleteRole(info.row.original._id)}
            >
              <FaTrash size={11} />
              Delete
            </button>
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: roles,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase();
      const r = row.original;
      return (
        !!r.roleName?.toLowerCase().includes(q) ||
        !!r.description?.toLowerCase().includes(q)
      );
    },
  });

  const inputClass =
    "w-full rounded-lg text-sm pl-9 pr-3 py-2 bg-white/50 border border-white/60 text-gray-700 placeholder-gray-400 outline-none focus:bg-white/70 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20 transition-all";

  const pageBtnClass =
    "h-8 w-8 inline-flex items-center justify-center rounded-lg text-xs font-semibold text-gray-600 bg-white/50 hover:bg-white/80 border border-white/60 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/50 transition-colors";

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
      <div className="relative flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500/80 to-violet-500/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
            <FaUserShield size={13} />
          </div>
          <h5 className="text-sm font-semibold text-white tracking-wide m-0">
            Role Master
          </h5>
        </div>

        <Link
          href="/dashboard/roles/create"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-white/90 hover:bg-white transition-colors"
        >
          <FaPlus size={10} />
          Create Role
        </Link>
      </div>

      {/* body */}
      <div className="relative p-5">
        {/* search + count */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <FaSearch
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className={inputClass}
              placeholder="Search role name, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-gray-500">
            {table.getFilteredRowModel().rows.length} of {roles.length}
          </span>
        </div>

        {/* table */}
        <div className="rounded-xl overflow-hidden border border-white/60 bg-white/30">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  className="bg-gradient-to-r from-indigo-500/80 to-violet-500/80"
                >
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-gray-400"
                  >
                    No roles found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-white/50 hover:bg-white/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-200/70 pt-4 flex-wrap">
          <span className="text-xs text-gray-500">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              className={pageBtnClass}
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              «
            </button>
            <button
              className={pageBtnClass}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ‹
            </button>
            <button
              className={pageBtnClass}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              ›
            </button>
            <button
              className={pageBtnClass}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}