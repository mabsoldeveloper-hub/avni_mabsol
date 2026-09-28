"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaCalendarAlt, FaSearch, FaPlus, FaTrash, FaCheckCircle } from "react-icons/fa";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { useUser } from "@/context/UserContext";

type FY = {
  _id: string;
  companyId?: { _id: string; companyName?: string };
  fyName?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  status?: string;
};

const columnHelper = createColumnHelper<FY>();

const setCurrentFY = async (row: FY, reload: () => void) => {
  const res = await fetch("/api/financial-year/set-current", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyId: row.companyId?._id,
      fyId: row._id,
    }),
  });

  if (res.ok) {
    alert(`Financial Year ${row.fyName} is now Active`);
    reload();
  } else {
    alert("Failed to change Financial Year");
  }
};

export default function FYListPage() {
  const [years, setYears] = useState<FY[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/financial-year");
      const data = await res.json();
      setYears(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteFY = async (id: string) => {
    if (!confirm("Delete FY ?")) return;
    await fetch(`/api/financial-year/${id}`, { method: "DELETE" });
    loadData();
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.companyId?.companyName, {
        id: "companyName",
        header: "Company",
        cell: (info) => (
          <span className="font-medium text-gray-700">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor((row: any) => row.fyCode, {
        id: "fyCode",
        header: "MabsolCRM Code",
        cell: (info) => {
          const val = info.getValue();
          const row = info.row.original;
          return (
            <button
              onClick={async () => {
                const newCode = prompt("Enter MabsolCRM FY Code (e.g. I05, I06, I04):", val || "");
                if (newCode !== null && newCode.trim() !== (val || "")) {
                  await fetch(`/api/financial-year/${row._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fyCode: newCode.toUpperCase().trim() }),
                  });
                  loadData();
                }
              }}
              title="Click to edit MabsolCRM FY Code"
              className="font-mono text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-0.5 rounded-md cursor-pointer transition-colors shadow-2xs"
            >
              {val || "+ Set Code"}
            </button>
          );
        },
      }),
      columnHelper.accessor("fyName", {
        header: "FY Name",
        cell: (info) => (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-400/20">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("startDate", {
        header: "Start Date",
        cell: (info) =>
          info.getValue() ? (
            <span className="text-gray-600">
              {new Date(info.getValue() as string).toLocaleDateString()}
            </span>
          ) : (
            "—"
          ),
      }),
      columnHelper.accessor("endDate", {
        header: "End Date",
        cell: (info) =>
          info.getValue() ? (
            <span className="text-gray-600">
              {new Date(info.getValue() as string).toLocaleDateString()}
            </span>
          ) : (
            "—"
          ),
      }),
      columnHelper.accessor("isCurrent", {
        header: "Current FY",
        cell: (info) =>
          info.getValue() ? (
            <FaCheckCircle className="text-emerald-500" size={14} />
          ) : (
            <span className="text-gray-300">—</span>
          ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <span className="text-gray-600">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <button
                className={
                  row.isCurrent
                    ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-500/90 cursor-default"
                    : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-400/30 hover:bg-emerald-500/20 transition-colors"
                }
                disabled={row.isCurrent}
                onClick={() => setCurrentFY(row, loadData)}
              >
                {row.isCurrent ? "✓ Current" : "Set Current"}
              </button>

              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-500/90 hover:bg-rose-500 transition-colors"
                onClick={() => deleteFY(row._id)}
              >
                <FaTrash size={11} />
                Delete
              </button>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: years,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase();
      const y = row.original;
      return (
        !!y.companyId?.companyName?.toLowerCase().includes(q) ||
        !!y.fyName?.toLowerCase().includes(q) ||
        !!y.status?.toLowerCase().includes(q)
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
            <FaCalendarAlt size={13} />
          </div>
          <h5 className="text-sm font-semibold text-white tracking-wide m-0">
            Financial Years
          </h5>
        </div>

        <Link
          href={`/dashboard/${user.role}/financial-year/create`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-white/90 hover:bg-white transition-colors"
        >
          <FaPlus size={10} />
          Add Financial Year
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
              placeholder="Search company, FY, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-gray-500">
            {table.getFilteredRowModel().rows.length} of {years.length}
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
                    No financial years found.
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