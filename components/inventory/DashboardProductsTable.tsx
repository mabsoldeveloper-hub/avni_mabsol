"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import {
  FaBoxes,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaBuilding,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

type Product = {
  _id: string;
  CODE?: string;
  PRODUCT?: string;
  companyName?: string;
  GCODE?: string;
  COMPANY?: string;
  DIV?: string;
  DIVISION?: string;
  division?: string;
  SUBDIV?: string;
  SUB_DIV?: string;
  subDivision?: string;
  CAT?: string;
  CATEGORY?: string;
  category?: string;
  PACK?: string;
  pack?: string;
  MRP?: number;
  PRATE?: number;
  RATEF?: number;
  BALANCE?: number;
  IGST?: number;
  STATUS?: string;
};

const columnHelper = createColumnHelper<Product>();

function stockClasses(balance: number) {
  if (balance < 0) return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
  if (balance <= 10) return "bg-amber-500/15 text-amber-700 ring-amber-500/30";
  return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
}

export default function DashboardProductsTable({
  products,
  role = "admin",
}: {
  products: Product[];
  role?: string;
}) {
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Search filter
  const filteredData = useMemo(() => {
    if (!search.trim()) return products || [];
    const q = search.toLowerCase();
    return (products || []).filter(
      (p) =>
        (p.PRODUCT || "").toLowerCase().includes(q) ||
        String(p.CODE || "").toLowerCase().includes(q) ||
        (p.companyName || p.GCODE || p.COMPANY || "").toLowerCase().includes(q) ||
        (p.division || p.DIV || p.DIVISION || "").toLowerCase().includes(q) ||
        (p.subDivision || p.SUBDIV || p.SUB_DIV || "").toLowerCase().includes(q) ||
        (p.category || p.CAT || p.CATEGORY || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("CODE", {
        header: "Code",
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-gray-600">
            {info.getValue() || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("PRODUCT", {
        header: "Product",
        cell: (info) => {
          const row = info.row.original;
          const pack = row.pack || row.PACK;
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-gray-800">{info.getValue()}</span>
              {pack && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {pack}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.companyName || row.GCODE || row.COMPANY, {
        id: "company",
        header: "Company",
        cell: (info) => {
          const val = info.getValue() || "-";
          if (val === "-") return val;
          return (
            <span
              className="font-semibold text-violet-700 truncate max-w-[140px] block"
              title={val}
            >
              {val}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.division || row.DIV || row.DIVISION || "-", {
        id: "division",
        header: "Division",
        cell: (info) => {
          const val = info.getValue() || "-";
          if (val === "-") return <span className="text-gray-400 text-xs">-</span>;
          return (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/20 max-w-[120px] truncate"
              title={val}
            >
              {val}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.subDivision || row.SUBDIV || row.SUB_DIV || "-", {
        id: "subDivision",
        header: "Sub-Div",
        cell: (info) => {
          const val = info.getValue() || "-";
          if (val === "-") return <span className="text-gray-400 text-xs">-</span>;
          return (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 ring-1 ring-amber-500/20 max-w-[120px] truncate"
              title={val}
            >
              {val}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.category || row.CAT || row.CATEGORY || "-", {
        id: "category",
        header: "Category",
        cell: (info) => {
          const val = info.getValue() || "-";
          if (val === "-") return <span className="text-gray-400 text-xs">-</span>;
          return (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-800 ring-1 ring-purple-500/20 max-w-[120px] truncate"
              title={val}
            >
              {val}
            </span>
          );
        },
      }),
      columnHelper.accessor("BALANCE", {
        header: "Stock",
        cell: (info) => {
          const val = Number(info.getValue() || 0);
          return (
            <span
              className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-full text-xs font-bold ring-1 ${stockClasses(
                val
              )}`}
            >
              {val.toLocaleString()}
            </span>
          );
        },
      }),
      columnHelper.accessor("MRP", {
        header: "MRP",
        cell: (info) => `₹ ${Number(info.getValue() || 0).toFixed(2)}`,
      }),
      columnHelper.accessor("PRATE", {
        header: "Purchase",
        cell: (info) => `₹ ${Number(info.getValue() || 0).toFixed(2)}`,
      }),
      columnHelper.accessor("RATEF", {
        header: "Sale",
        cell: (info) => `₹ ${Number(info.getValue() || 0).toFixed(2)}`,
      }),
      columnHelper.accessor("IGST", {
        header: "GST",
        cell: (info) => `${info.getValue() ?? 0}%`,
      }),
      columnHelper.accessor("STATUS", {
        header: "Status",
        cell: (info) =>
          info.getValue() === "Y" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30">
              <FaCheckCircle size={9} />
              <span>Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30">
              <FaTimesCircle size={9} />
              <span>Inactive</span>
            </span>
          ),
      }),
      columnHelper.display({
        id: "action",
        header: "Action",
        cell: (info) => (
          <Link
            href={`/dashboard/${role}/inventory/products/view/${info.row.original._id}`}
            className="
              inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
              bg-white/50 text-blue-600 ring-1 ring-blue-500/30
              hover:bg-blue-600 hover:text-white hover:ring-blue-600
              transition-all duration-200
            "
          >
            <FaEye size={10} />
            <span>View</span>
          </Link>
        ),
      }),
    ],
    [role]
  );

  const numericCols = ["MRP", "PRATE", "RATEF", "BALANCE", "IGST"];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div
      className="
        relative rounded-2xl overflow-hidden
        bg-white/70 backdrop-blur-xl
        border border-slate-200/80
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
      "
    >
      {/* Top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* Header with Search and Title */}
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 backdrop-blur-md text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/20 text-white shadow-xs">
            <FaBoxes size={13} />
          </div>
          <div>
            <h5 className="text-sm font-bold text-white tracking-wide m-0 flex items-center gap-2">
              <span>Filtered Products Catalog</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
                {products?.length || 0} Products
              </span>
            </h5>
            <p className="text-[10px] text-blue-100 m-0">
              Showing live catalog products matching selected Company, Division, Sub-Division & Category
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, code, company..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/20 text-white placeholder-white/70 ring-1 ring-white/30 focus:ring-white/60 outline-none backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Table Body */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200/80 bg-slate-50/80 text-gray-600">
                {headerGroup.headers.map((header) => {
                  const sortDir = header.column.getIsSorted();
                  const isNumeric = numericCols.includes(header.column.id);
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`select-none cursor-pointer whitespace-nowrap px-3.5 py-2.5 font-bold text-[11px] uppercase tracking-wide ${
                        isNumeric ? "text-right" : "text-left"
                      } hover:text-gray-900 transition-colors`}
                    >
                      <span className={`inline-flex items-center gap-1 ${isNumeric ? "flex-row-reverse" : ""}`}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          (sortDir === "asc" ? (
                            <FaSortUp size={11} className="text-slate-600" />
                          ) : sortDir === "desc" ? (
                            <FaSortDown size={11} className="text-slate-600" />
                          ) : (
                            <FaSort size={10} className="text-gray-300" />
                          ))}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-blue-50/40 transition-colors duration-150"
                >
                  {row.getVisibleCells().map((cell) => {
                    const isNumeric = numericCols.includes(cell.column.id);
                    return (
                      <td
                        key={cell.id}
                        className={`px-3.5 py-2.5 whitespace-nowrap text-gray-700 tabular-nums ${
                          isNumeric ? "text-right" : "text-left"
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center text-gray-400 py-10 text-xs font-semibold">
                  No products found matching the selected hierarchy filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/70 bg-white/40 text-xs text-gray-500">
        <span>
          Page <strong className="text-gray-800">{table.getState().pagination.pageIndex + 1}</strong> of{" "}
          <strong className="text-gray-800">{table.getPageCount() || 1}</strong> &middot;{" "}
          {table.getFilteredRowModel().rows.length} total products
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-2.5 h-7 rounded-lg text-xs font-semibold bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white disabled:opacity-40 transition cursor-pointer"
          >
            First
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white disabled:opacity-40 transition cursor-pointer"
          >
            <FaChevronLeft size={10} />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white disabled:opacity-40 transition cursor-pointer"
          >
            <FaChevronRight size={10} />
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-2.5 h-7 rounded-lg text-xs font-semibold bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white disabled:opacity-40 transition cursor-pointer"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}

