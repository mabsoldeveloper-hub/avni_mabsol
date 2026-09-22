"use client";

import { useEffect, useMemo, useState } from "react";
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
  FaCheckCircle,
  FaTimesCircle,
  FaBuilding,
  FaExclamationTriangle,
  FaLayerGroup,
  FaWarehouse,
  FaRupeeSign,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaMapMarkerAlt,
  FaArrowRight,
  FaPlus,
} from "react-icons/fa";
import AddProductModal from "@/components/product/AddProductModal";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";


type MrTerritoryInfo = {
  isMrRestricted: boolean;
  territories: any[];
  allowedCompanyCodes: string[];
};

type Product = {
  _id: string;
  CODE?: string;
  PRODUCT?: string;
  companyName?: string;
  GCODE?: string;
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

/* ---------------------------------------------------------- */
/* Summary card                                                 */
/* ---------------------------------------------------------- */

function SummaryCard({
  title,
  value,
  icon,
  ring,
  iconBg,
  glow,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  ring: string;
  iconBg: string;
  glow: string;
}) {
  return (
    <div
      className={`
        group relative rounded-2xl p-[1px]
        bg-gradient-to-br ${ring}
        transition-all duration-500 ease-out
        hover:-translate-y-1.5 hover:scale-[1.02]
      `}
    >
      <div
        className={`
          relative h-full rounded-2xl overflow-hidden
          bg-white/60 backdrop-blur-xl
          border border-white/40
          shadow-[0_4px_20px_rgba(0,0,0,0.06)]
          transition-all duration-500 ease-out
          group-hover:shadow-xl ${glow}
          p-3
        `}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />
        <div className="pointer-events-none absolute -inset-y-10 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />

        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-500 tracking-wide truncate">
              {title}
            </p>
            <h3
              className={`mt-0.5 font-semibold text-gray-800 tabular-nums truncate ${String(value).length > 9 ? "text-sm" : "text-lg"
                }`}
            >
              {value}
            </h3>
          </div>
          <div
            className={`
              flex items-center justify-center h-8 w-8 rounded-lg shrink-0
              ${iconBg}
              ring-1 ring-white/50
              transition-transform duration-500
              group-hover:scale-110 group-hover:rotate-3
            `}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Main page                                                    */
export default function ProductsPage() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);


  useEffect(() => {
    loadMrTerritoryInfo();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCompany?._id, selectedFY?._id]);

  const loadMrTerritoryInfo = async () => {
    try {
      const res = await fetch("/api/mr-territory/my-territories");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMrTerritoryInfo({
            isMrRestricted: json.isMrRestricted,
            territories: json.territories || [],
            allowedCompanyCodes: json.allowedCompanyCodes || [],
          });
        }
      }
    } catch {
      // Silently ignore
    }
  };

  const loadProducts = async () => {
    const params = new URLSearchParams();
    if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
    if (selectedFY?._id) params.set("fyId", selectedFY._id);

    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return products.filter(
      (p) =>
        (p.PRODUCT || "").toLowerCase().includes(s) ||
        String(p.CODE || "").toLowerCase().includes(s) ||
        (p.GCODE || "").toLowerCase().includes(s) ||
        (p.companyName || "").toLowerCase().includes(s)
    );
  }, [search, products]);

  const totalProducts = filtered.length;
  const activeProducts = filtered.filter((p) => p.STATUS === "Y").length;
  const inactiveProducts = filtered.filter((p) => p.STATUS !== "Y").length;
  const totalCompanies = new Set(
    filtered.map((p) => p.companyName || p.GCODE).filter(Boolean)
  ).size;
  const lowStock = filtered.filter(
    (p) => Number(p.BALANCE) > 0 && Number(p.BALANCE) <= 10
  ).length;
  const outOfStock = filtered.filter((p) => Number(p.BALANCE) <= 0).length;
  const totalStock = filtered.reduce(
    (sum, p) => sum + Number(p.BALANCE || 0),
    0
  );
  const totalStockValue = filtered.reduce(
    (sum, p) => sum + Number(p.BALANCE || 0) * Number(p.PRATE || 0),
    0
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("CODE", {
        header: "Code",
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("PRODUCT", {
        header: "Product",
        cell: (info) => (
          <span className="font-semibold text-gray-700">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor((row) => row.companyName || row.GCODE, {
        id: "company",
        header: "Company",
        cell: (info) => info.getValue() || "-",
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
      columnHelper.accessor("BALANCE", {
        header: "Stock",
        cell: (info) => {
          const val = Number(info.getValue() || 0);
          return (
            <span
              className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${stockClasses(
                val
              )}`}
            >
              {val.toLocaleString()}
            </span>
          );
        },
      }),
      columnHelper.accessor("IGST", {
        header: "GST",
        cell: (info) => `${info.getValue() ?? 0}%`,
      }),
      columnHelper.accessor("STATUS", {
        header: "Status",
        cell: (info) =>
          info.getValue() === "Y" ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30">
              Inactive
            </span>
          ),
      }),
      columnHelper.display({
        id: "action",
        header: "Action",
        cell: (info) => (
          <Link
            href={`/dashboard/inventory/products/view/${info.row.original._id}`}
            className="
              inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium
              bg-white/50 text-blue-600 ring-1 ring-blue-500/30
              hover:bg-blue-500 hover:text-white hover:ring-blue-500
              transition-all duration-200
            "
          >
            View
          </Link>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const numericCols = ["MRP", "PRATE", "RATEF", "BALANCE", "IGST"];

  return (
    <div className="space-y-4">
      {/* ==================== MR TERRITORY BANNER ==================== */}
      {mrTerritoryInfo?.isMrRestricted && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
          <div className="flex-shrink-0 mt-0.5">
            <FaMapMarkerAlt size={16} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Aap sirf apni assigned territory ke products dekh sakte hain.
              {mrTerritoryInfo.territories.length > 0 && (
                <>
                  {" "}Assigned:
                  {" "}
                  {Array.from(
                    new Set(
                      mrTerritoryInfo.territories.map(
                        (t) => t.companyName || t.companyCode
                      )
                    )
                  ).join(", ")}
                </>
              )}
            </p>
            {mrTerritoryInfo.territories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {mrTerritoryInfo.territories.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium border border-amber-200"
                  >
                    <FaBuilding size={8} />
                    {t.companyName || t.companyCode}
                    {t.divisionName ? (
                      <>
                        {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                        {t.divisionName}
                      </>
                    ) : null}
                    {t.subDivisionName ? (
                      <>
                        {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                        {t.subDivisionName}
                      </>
                    ) : null}
                    {t.categoryName ? (
                      <>
                        {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                        {t.categoryName}
                      </>
                    ) : null}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SUMMARY CARDS ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          title="Total Products"
          value={totalProducts}
          icon={<FaBoxes size={16} />}
          ring="from-blue-400/40 to-indigo-500/40"
          iconBg="bg-blue-500/15 text-blue-600"
          glow="group-hover:shadow-blue-400/30"
        />
        <SummaryCard
          title="Active"
          value={activeProducts}
          icon={<FaCheckCircle size={16} />}
          ring="from-emerald-400/40 to-green-500/40"
          iconBg="bg-emerald-500/15 text-emerald-600"
          glow="group-hover:shadow-emerald-400/30"
        />
        <SummaryCard
          title="Inactive"
          value={inactiveProducts}
          icon={<FaTimesCircle size={16} />}
          ring="from-rose-400/40 to-red-500/40"
          iconBg="bg-rose-500/15 text-rose-600"
          glow="group-hover:shadow-rose-400/30"
        />
        <SummaryCard
          title="Companies"
          value={totalCompanies}
          icon={<FaBuilding size={16} />}
          ring="from-violet-400/40 to-purple-500/40"
          iconBg="bg-violet-500/15 text-violet-600"
          glow="group-hover:shadow-violet-400/30"
        />
        <SummaryCard
          title="Low Stock"
          value={lowStock}
          icon={<FaExclamationTriangle size={16} />}
          ring="from-amber-400/40 to-orange-500/40"
          iconBg="bg-amber-500/15 text-amber-700"
          glow="group-hover:shadow-amber-400/30"
        />
        <SummaryCard
          title="Out Of Stock"
          value={outOfStock}
          icon={<FaLayerGroup size={16} />}
          ring="from-slate-400/40 to-gray-500/40"
          iconBg="bg-slate-500/15 text-slate-600"
          glow="group-hover:shadow-slate-400/30"
        />
        <SummaryCard
          title="Stock Value"
          value={`₹ ${totalStockValue.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
          })}`}
          icon={<FaRupeeSign size={16} />}
          ring="from-teal-400/40 to-emerald-500/40"
          iconBg="bg-teal-500/15 text-teal-600"
          glow="group-hover:shadow-teal-400/30"
        />
      </div>

      {/* ==================== TABLE CARD ==================== */}
      <div
        className="
          relative rounded-2xl overflow-hidden
          bg-white/60 backdrop-blur-xl
          border border-white/40
          shadow-[0_4px_20px_rgba(0,0,0,0.06)]
        "
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

        {/* header with search */}
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-600/85 to-indigo-600/85 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white">
              <FaBoxes size={14} />
            </div>
            <h5 className="text-sm font-semibold text-white tracking-wide m-0">
              Product Master
            </h5>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <FaSearch
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, code or company..."
                className="
                  w-full pl-8 pr-3 py-1.5 rounded-lg text-xs
                  bg-white/15 text-white placeholder-white/60
                  ring-1 ring-white/25 focus:ring-white/50
                  outline-none backdrop-blur-md
                  transition-all duration-200
                "
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="
                w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-white text-blue-700 shadow-sm
                hover:bg-blue-50 hover:text-blue-800 active:scale-95
                transition-all duration-200 shrink-0 cursor-pointer
              "
            >
              <FaPlus size={11} />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* table body */}
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-gray-200/70 bg-white/30"
                >
                  {headerGroup.headers.map((header) => {
                    const sortDir = header.column.getIsSorted();
                    const isNumeric = numericCols.includes(header.column.id);
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={`
                          select-none cursor-pointer whitespace-nowrap px-4 py-2.5
                          font-medium text-gray-500 text-xs uppercase tracking-wide
                          ${isNumeric ? "text-right" : "text-left"}
                          hover:text-gray-700 transition-colors
                        `}
                      >
                        <span
                          className={`inline-flex items-center gap-1 ${isNumeric ? "flex-row-reverse" : ""
                            }`}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() &&
                            (sortDir === "asc" ? (
                              <FaSortUp size={11} className="text-slate-500" />
                            ) : sortDir === "desc" ? (
                              <FaSortDown size={11} className="text-slate-500" />
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
                          className={`px-4 py-2.5 whitespace-nowrap text-gray-600 tabular-nums ${isNumeric ? "text-right" : "text-left"
                            }`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center text-gray-400 py-10 text-sm"
                  >
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* pagination footer */}
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
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
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="
                px-2.5 h-7 rounded-lg text-xs font-medium
                bg-white/50 ring-1 ring-gray-200 text-gray-600
                hover:bg-blue-600 hover:text-white hover:ring-blue-600
                disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
                transition-all duration-200
              "
            >
              First
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="
                flex items-center justify-center h-7 w-7 rounded-lg
                bg-white/50 ring-1 ring-gray-200 text-gray-600
                hover:bg-blue-600 hover:text-white hover:ring-blue-600
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
                hover:bg-blue-600 hover:text-white hover:ring-blue-600
                disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
                transition-all duration-200
              "
            >
              <FaChevronRight size={10} />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="
                px-2.5 h-7 rounded-lg text-xs font-medium
                bg-white/50 ring-1 ring-gray-200 text-gray-600
                hover:bg-blue-600 hover:text-white hover:ring-blue-600
                disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
                transition-all duration-200
              "
            >
              Last
            </button>
          </div>
        </div>
      </div>

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadProducts}
      />
    </div>
  );
}