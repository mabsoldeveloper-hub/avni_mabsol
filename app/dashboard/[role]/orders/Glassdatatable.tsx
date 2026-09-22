"use client";

import { useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";

interface GlassDataTableProps<T> {
    data: T[];
    columns: ColumnDef<T, any>[];
    searchPlaceholder?: string;
    pageSize?: number;
}

export function GlassDataTable<T>({
    data,
    columns,
    searchPlaceholder = "Search...",
    pageSize = 5,
}: GlassDataTableProps<T>) {
    const [globalFilter, setGlobalFilter] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data: data ?? [],
        columns,
        state: { globalFilter, sorting },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize } },
    });

    return (
        <div className="space-y-3">
            {/* Search bar */}
            <div className="relative w-full sm:w-72">
                <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-xl border border-white/40 bg-white/50 backdrop-blur-md
                     pl-9 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-400
                     shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/60
                     transition"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl shadow-lg">
                <table className="w-full text-sm">
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr
                                key={hg.id}
                                className="bg-gradient-to-r from-indigo-500/90 to-violet-500/90 text-white"
                            >
                                {hg.headers.map((header) => {
                                    const sortable = header.column.getCanSort();
                                    const sortDir = header.column.getIsSorted();
                                    return (
                                        <th
                                            key={header.id}
                                            onClick={header.column.getToggleSortingHandler()}
                                            className={`py-3 px-4 text-left font-medium whitespace-nowrap select-none ${sortable ? "cursor-pointer hover:bg-white/10" : ""
                                                }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {sortable &&
                                                    (sortDir === "asc" ? (
                                                        <ArrowUp size={13} />
                                                    ) : sortDir === "desc" ? (
                                                        <ArrowDown size={13} />
                                                    ) : (
                                                        <ChevronsUpDown size={13} className="opacity-50" />
                                                    ))}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-white/30 last:border-0 hover:bg-white/50 transition"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="py-2.5 px-4 whitespace-nowrap text-gray-700">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="py-6 text-center text-gray-400"
                                >
                                    No data
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <p className="text-xs text-gray-500">
                    Page{" "}
                    <span className="font-medium text-gray-700">
                        {table.getState().pagination.pageIndex + 1}
                    </span>{" "}
                    of <span className="font-medium text-gray-700">{table.getPageCount() || 1}</span>
                    {"  "}·{" "}
                    <span className="font-medium text-gray-700">
                        {table.getFilteredRowModel().rows.length}
                    </span>{" "}
                    rows
                </p>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="flex items-center gap-1 rounded-lg border border-white/40 bg-white/50
                       backdrop-blur-md px-3 py-1.5 text-xs font-medium text-gray-600
                       shadow-sm hover:bg-white/80 disabled:opacity-40 disabled:hover:bg-white/50
                       transition"
                    >
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="flex items-center gap-1 rounded-lg border border-white/40 bg-white/50
                       backdrop-blur-md px-3 py-1.5 text-xs font-medium text-gray-600
                       shadow-sm hover:bg-white/80 disabled:opacity-40 disabled:hover:bg-white/50
                       transition"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export { createColumnHelper };