"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
    FaTrophy,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaSearch,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";

type TopProduct = {
    code: string;
    product: string;
    company: string;
    qty: number;
    amount: number;
    mrp: number;
};

const columnHelper = createColumnHelper<TopProduct>();

export default function TopProducts() {
    const [products, setProducts] = useState<TopProduct[]>([]);
    const [sorting, setSorting] = useState<SortingState>([
        { id: "amount", desc: true },
    ]);
    const [globalFilter, setGlobalFilter] = useState("");
    const { selectedFY } = useFinancialYear();
    const { selectedCompany } = useCompany();

    const loadProducts = useCallback(async () => {
        const params = new URLSearchParams();
        if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

        if (selectedFY) {
            if (selectedFY.isAll) {
                params.set("fyId", "ALL");
            } else if (selectedFY._id) {
                params.set("fyId", selectedFY._id);
                if (selectedFY.startDate && selectedFY.endDate) {
                    const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
                    const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
                    params.set("startDate", s);
                    params.set("endDate", e);
                }
            }
        }

        const url = `/api/sales/top-products?${params.toString()}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            setProducts([]);
        }
    }, [selectedFY?._id, selectedCompany?._id]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const columns = useMemo(
        () => [
            columnHelper.accessor("product", {
                header: "Product",
                cell: (info) => (
                    <span className="font-semibold text-gray-700">{info.getValue()}</span>
                ),
            }),
            columnHelper.accessor("company", {
                header: "Company",
                cell: (info) => info.getValue() || "-",
            }),
            columnHelper.accessor("qty", {
                header: "Qty",
                cell: (info) => Number(info.getValue() || 0).toLocaleString(),
            }),
            columnHelper.accessor("amount", {
                header: "Amount",
                cell: (info) =>
                    `₹ ${Number(info.getValue() || 0).toLocaleString("en-IN")}`,
            }),
            columnHelper.accessor("mrp", {
                header: "MRP",
                cell: (info) =>
                    `₹ ${Number(info.getValue() || 0).toLocaleString("en-IN")}`,
            }),
        ],
        []
    );

    const table = useReactTable({
        data: products,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 8 } },
        globalFilterFn: (row, columnId, filterValue) => {
            const search = String(filterValue).toLowerCase();
            const product = String(row.original.product ?? "").toLowerCase();
            const company = String(row.original.company ?? "").toLowerCase();
            return product.includes(search) || company.includes(search);
        },
    });

    const numericCols = ["qty", "amount", "mrp"];

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
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500/85 to-green-500/85 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
                        <FaTrophy size={14} />
                    </div>
                    <h5 className="text-sm font-semibold text-white tracking-wide m-0">
                        Top Selling Products
                    </h5>
                </div>

                <div className="relative w-full sm:w-64">
                    <FaSearch
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
                    />
                    <input
                        type="text"
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder="Search product or company..."
                        className="
              w-full pl-8 pr-3 py-1.5 rounded-lg text-xs
              bg-white/20 text-white placeholder-white/70
              ring-1 ring-white/30 focus:ring-white/60
              outline-none backdrop-blur-md
              transition-all duration-200
            "
                    />
                </div>
            </div>

            {/* body */}
            <div className="relative overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-gray-200/70 bg-white/30">
                                {headerGroup.headers.map((header) => {
                                    const sortDir = header.column.getIsSorted();
                                    const isNumeric = numericCols.includes(header.column.id);
                                    return (
                                        <th
                                            key={header.id}
                                            onClick={header.column.getToggleSortingHandler()}
                                            className={`
                        select-none cursor-pointer px-4 py-2.5
                        font-medium text-gray-500 text-xs uppercase tracking-wide
                        ${isNumeric ? "text-right" : "text-left"}
                        hover:text-gray-700 transition-colors
                      `}
                                        >
                                            <span
                                                className={`inline-flex items-center gap-1 ${isNumeric ? "flex-row-reverse" : ""
                                                    }`}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {sortDir === "asc" ? (
                                                    <FaSortUp size={11} className="text-emerald-500" />
                                                ) : sortDir === "desc" ? (
                                                    <FaSortDown size={11} className="text-emerald-500" />
                                                ) : (
                                                    <FaSort size={10} className="text-gray-300" />
                                                )}
                                            </span>
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
                                    className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                                >
                                    {row.getVisibleCells().map((cell) => {
                                        const isNumeric = numericCols.includes(cell.column.id);
                                        return (
                                            <td
                                                key={cell.id}
                                                className={`px-4 py-2.5 text-gray-600 tabular-nums ${isNumeric ? "text-right" : "text-left"
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
                                <td colSpan={columns.length} className="text-center text-gray-400 py-8 text-sm">
                                    No Products Found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* pagination footer */}
            <div className="relative flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
                <span>
                    Page{" "}
                    <span className="font-semibold text-gray-700">
                        {table.getState().pagination.pageIndex + 1}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-700">
                        {table.getPageCount() || 1}
                    </span>{" "}
                    &middot; {table.getFilteredRowModel().rows.length} results
                </span>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="
              flex items-center justify-center h-7 w-7 rounded-lg
              bg-white/50 ring-1 ring-gray-200 text-gray-600
              hover:bg-emerald-500 hover:text-white hover:ring-emerald-500
              disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
              transition-all duration-200
            "
                    >
                        <FaChevronLeft size={10} />
                    </button>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="
              flex items-center justify-center h-7 w-7 rounded-lg
              bg-white/50 ring-1 ring-gray-200 text-gray-600
              hover:bg-emerald-500 hover:text-white hover:ring-emerald-500
              disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
              transition-all duration-200
            "
                    >
                        <FaChevronRight size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
}