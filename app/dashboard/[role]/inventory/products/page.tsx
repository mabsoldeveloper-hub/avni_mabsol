"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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
  FaFilter,
  FaTimes,
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
  isActive = false,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  ring: string;
  iconBg: string;
  glow: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`
        group relative rounded-2xl p-[1px] cursor-pointer
        bg-gradient-to-br ${ring}
        transition-all duration-300 ease-out
        hover:-translate-y-1.5 hover:scale-[1.02]
        ${isActive ? "ring-2 ring-offset-2 ring-blue-500 scale-[1.02] shadow-lg" : ""}
      `}
    >
      <div
        className={`
          relative h-full rounded-2xl overflow-hidden
          ${isActive ? "bg-white/95" : "bg-white/70"} backdrop-blur-xl
          border border-white/50
          shadow-[0_4px_20px_rgba(0,0,0,0.06)]
          transition-all duration-300 ease-out
          group-hover:shadow-xl ${glow}
          p-3
        `}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />
        <div className="pointer-events-none absolute -inset-y-10 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />

        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-medium text-gray-500 tracking-wide truncate">
                {title}
              </p>
              {isActive && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-blue-100 text-blue-700">
                  Active
                </span>
              )}
            </div>
            <h3
              className={`mt-0.5 font-bold text-gray-800 tabular-nums truncate ${
                String(value).length > 9 ? "text-sm" : "text-lg"
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
              transition-transform duration-300
              group-hover:scale-110 group-hover:rotate-3
            `}
          >
            {icon}
          </div>
        </div>

        <div className="relative mt-2 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-blue-600 transition-colors font-medium">
          <span>{isActive ? "Filtered (Click to clear)" : "Click to filter"}</span>
          <FaArrowRight size={7} className="transform group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Main page content                                          */
/* ---------------------------------------------------------- */

function ProductsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = (params?.role as string) || "admin";

  const activeFilter = searchParams.get("filter") || "all";
  const selectedCompanyParam = searchParams.get("company") || "";

  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

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

    const res = await fetch(`/api/master/product?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  // 1. Metrics computed across all catalog products
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.STATUS === "Y").length;
  const inactiveProducts = products.filter((p) => p.STATUS !== "Y").length;
  const totalCompanies = new Set(
    products.map((p) => p.companyName || p.GCODE).filter(Boolean)
  ).size;
  const availableProducts = products.filter((p) => Number(p.BALANCE) > 0).length;
  const lowStock = products.filter(
    (p) => Number(p.BALANCE) > 0 && Number(p.BALANCE) <= 10
  ).length;
  const outOfStock = products.filter((p) => Number(p.BALANCE) <= 0).length;
  const totalStockValue = products.reduce(
    (sum, p) => sum + Number(p.BALANCE || 0) * Number(p.PRATE || 0),
    0
  );

  // 2. Company statistics breakdown for the 8 companies
  const companyStats = useMemo(() => {
    const map = new Map<string, { companyName: string; count: number; stock: number; stockValue: number }>();
    products.forEach((p) => {
      const cName = (p.companyName || p.GCODE || "Unknown").trim();
      if (!cName) return;
      const cur = map.get(cName) || { companyName: cName, count: 0, stock: 0, stockValue: 0 };
      cur.count += 1;
      cur.stock += Number(p.BALANCE || 0);
      cur.stockValue += Number(p.BALANCE || 0) * Number(p.PRATE || 0);
      map.set(cName, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [products]);

  const handleCardClick = (filterKey: string) => {
    if (filterKey === "companies") {
      if (activeFilter === "companies" && !selectedCompanyParam) {
        router.push(`/dashboard/${role}/inventory/products?filter=all`);
      } else {
        router.push(`/dashboard/${role}/inventory/products?filter=companies`);
      }
      return;
    }
    if (activeFilter === filterKey && filterKey !== "all" && !selectedCompanyParam) {
      router.push(`/dashboard/${role}/inventory/products?filter=all`);
    } else {
      router.push(`/dashboard/${role}/inventory/products?filter=${filterKey}`);
    }
  };

  // 3. Filter products based on selected KPI Card, Company, and Search string
  const displayProducts = useMemo(() => {
    let list = products;

    if (activeFilter === "active") {
      list = list.filter((p) => p.STATUS === "Y");
    } else if (activeFilter === "inactive") {
      list = list.filter((p) => p.STATUS !== "Y");
    } else if (activeFilter === "available") {
      list = list.filter((p) => Number(p.BALANCE) > 0);
    } else if (activeFilter === "low_stock") {
      list = list.filter((p) => Number(p.BALANCE) > 0 && Number(p.BALANCE) <= 10);
    } else if (activeFilter === "out_of_stock") {
      list = list.filter((p) => Number(p.BALANCE) <= 0);
    } else if (activeFilter === "stock_value") {
      list = list
        .filter((p) => Number(p.BALANCE) > 0)
        .slice()
        .sort(
          (a, b) =>
            Number(b.BALANCE || 0) * Number(b.PRATE || 0) -
            Number(a.BALANCE || 0) * Number(a.PRATE || 0)
        );
    }

    if (selectedCompanyParam) {
      const matchComp = selectedCompanyParam.toLowerCase();
      list = list.filter(
        (p) => (p.companyName || p.GCODE || "").trim().toLowerCase() === matchComp
      );
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.PRODUCT || "").toLowerCase().includes(s) ||
          String(p.CODE || "").toLowerCase().includes(s) ||
          (p.GCODE || "").toLowerCase().includes(s) ||
          (p.companyName || "").toLowerCase().includes(s)
      );
    }

    return list;
  }, [products, activeFilter, selectedCompanyParam, search]);

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
        cell: (info) => {
          const val = info.getValue() || "-";
          if (val === "-") return val;
          return (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/${role}/inventory/products?filter=companies&company=${encodeURIComponent(val)}`
                )
              }
              title={`Click to filter products by ${val}`}
              className="font-medium text-violet-700 hover:text-violet-900 hover:underline cursor-pointer text-left"
            >
              {val}
            </button>
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
            href={`/dashboard/${role}/inventory/products/view/${info.row.original._id}`}
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
    [role]
  );

  const table = useReactTable({
    data: displayProducts,
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

  const getFilterLabel = () => {
    if (selectedCompanyParam) {
      return `Company: ${selectedCompanyParam}`;
    }
    switch (activeFilter) {
      case "active":
        return "Active Products";
      case "inactive":
        return "Inactive Products";
      case "companies":
        return "All 8 Pharma Companies";
      case "available":
        return "Available In Stock";
      case "low_stock":
        return "Low Stock Products (<= 10)";
      case "out_of_stock":
        return "Out Of Stock Products";
      case "stock_value":
        return "Highest Stock Value Products";
      default:
        return activeFilter;
    }
  };

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

      {/* ==================== SUMMARY CARDS (8 KPI CARDS) ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          title="Total Products"
          value={totalProducts}
          icon={<FaBoxes size={16} />}
          ring="from-blue-400/40 to-indigo-500/40"
          iconBg="bg-blue-500/15 text-blue-600"
          glow="group-hover:shadow-blue-400/30"
          isActive={activeFilter === "all" && !selectedCompanyParam}
          onClick={() => handleCardClick("all")}
        />
        <SummaryCard
          title="Active"
          value={activeProducts}
          icon={<FaCheckCircle size={16} />}
          ring="from-emerald-400/40 to-green-500/40"
          iconBg="bg-emerald-500/15 text-emerald-600"
          glow="group-hover:shadow-emerald-400/30"
          isActive={activeFilter === "active" && !selectedCompanyParam}
          onClick={() => handleCardClick("active")}
        />
        <SummaryCard
          title="Inactive"
          value={inactiveProducts}
          icon={<FaTimesCircle size={16} />}
          ring="from-rose-400/40 to-red-500/40"
          iconBg="bg-rose-500/15 text-rose-600"
          glow="group-hover:shadow-rose-400/30"
          isActive={activeFilter === "inactive" && !selectedCompanyParam}
          onClick={() => handleCardClick("inactive")}
        />
        <SummaryCard
          title="Companies"
          value={totalCompanies}
          icon={<FaBuilding size={16} />}
          ring="from-violet-400/40 to-purple-500/40"
          iconBg="bg-violet-500/15 text-violet-600"
          glow="group-hover:shadow-violet-400/30"
          isActive={activeFilter === "companies" || Boolean(selectedCompanyParam)}
          onClick={() => handleCardClick("companies")}
        />
        <SummaryCard
          title="Available"
          value={availableProducts}
          icon={<FaWarehouse size={16} />}
          ring="from-cyan-400/40 to-sky-500/40"
          iconBg="bg-cyan-500/15 text-cyan-600"
          glow="group-hover:shadow-cyan-400/30"
          isActive={activeFilter === "available" && !selectedCompanyParam}
          onClick={() => handleCardClick("available")}
        />
        <SummaryCard
          title="Low Stock"
          value={lowStock}
          icon={<FaExclamationTriangle size={16} />}
          ring="from-amber-400/40 to-orange-500/40"
          iconBg="bg-amber-500/15 text-amber-700"
          glow="group-hover:shadow-amber-400/30"
          isActive={activeFilter === "low_stock" && !selectedCompanyParam}
          onClick={() => handleCardClick("low_stock")}
        />
        <SummaryCard
          title="Out Of Stock"
          value={outOfStock}
          icon={<FaLayerGroup size={16} />}
          ring="from-slate-400/40 to-gray-500/40"
          iconBg="bg-slate-500/15 text-slate-600"
          glow="group-hover:shadow-slate-400/30"
          isActive={activeFilter === "out_of_stock" && !selectedCompanyParam}
          onClick={() => handleCardClick("out_of_stock")}
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
          isActive={activeFilter === "stock_value" && !selectedCompanyParam}
          onClick={() => handleCardClick("stock_value")}
        />
      </div>

      {/* ==================== COMPANIES FILTER PANEL ==================== */}
      {(activeFilter === "companies" || selectedCompanyParam) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50/90 via-purple-50/70 to-indigo-50/90 border border-violet-200/80 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="p-1.5 rounded-lg bg-violet-600 text-white shadow-xs">
                <FaBuilding size={12} />
              </div>
              <span className="font-bold text-violet-950">
                Companies in Catalog ({totalCompanies} Manufacturers)
              </span>
              {selectedCompanyParam && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-violet-600 text-white shadow-xs">
                  {selectedCompanyParam} ({displayProducts.length} products)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCompanyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-violet-300 text-violet-700 hover:bg-violet-50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <FaBuilding size={11} />
                <span>View All 8 Companies Detail</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/dashboard/${role}/inventory/products?filter=all`)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span>✕ Show All Products</span>
              </button>
            </div>
          </div>

          {/* Quick Select Company Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/${role}/inventory/products?filter=companies`)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !selectedCompanyParam
                  ? "bg-violet-600 text-white shadow-xs ring-2 ring-violet-400"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-violet-50 hover:border-violet-300"
              }`}
            >
              All Companies ({totalProducts})
            </button>
            {companyStats.map((c) => {
              const isSelected = selectedCompanyParam.toLowerCase() === c.companyName.toLowerCase();
              return (
                <button
                  key={c.companyName}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/${role}/inventory/products?filter=companies&company=${encodeURIComponent(
                        c.companyName
                      )}`
                    )
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-violet-600 text-white shadow-xs ring-2 ring-violet-400"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700"
                  }`}
                >
                  <span>{c.companyName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== ACTIVE FILTER BANNER (NON-COMPANY) ==================== */}
      {activeFilter !== "all" && activeFilter !== "companies" && !selectedCompanyParam && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-blue-50/90 border border-blue-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-blue-900">
            <FaFilter className="text-blue-600 shrink-0" />
            <span>
              Active Filter:{" "}
              <strong className="font-bold text-blue-800 underline">
                {getFilterLabel()}
              </strong>{" "}
              <span className="font-semibold text-blue-600">
                ({displayProducts.length} {displayProducts.length === 1 ? "product" : "products"} shown)
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCardClick("all")}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span>✕ Clear Filter</span>
            <span className="text-[10px] opacity-75">(Show All)</span>
          </button>
        </div>
      )}

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

      {/* ==================== COMPANY BREAKDOWN MODAL ==================== */}
      {isCompanyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsCompanyModalOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20">
                  <FaBuilding size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Pharma Companies & Manufacturers</h3>
                  <p className="text-xs text-violet-100 mt-0.5">
                    {companyStats.length} total companies linked with catalog products
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompanyModalOpen(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <FaTimes size={14} />
              </button>
            </div>

            {/* Modal Body: Table of companies */}
            <div className="p-6 max-h-[65vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left w-12">#</th>
                    <th className="px-4 py-2.5 text-left">Company Name</th>
                    <th className="px-4 py-2.5 text-center">Products</th>
                    <th className="px-4 py-2.5 text-right">Stock (Units)</th>
                    <th className="px-4 py-2.5 text-right">Stock Value (₹)</th>
                    <th className="px-4 py-2.5 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companyStats.map((c, idx) => (
                    <tr
                      key={c.companyName + idx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {c.companyName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                          {c.count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-600 tabular-nums">
                        {c.stock.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">
                        ₹ {c.stockValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCompanyModalOpen(false);
                            router.push(
                              `/dashboard/${role}/inventory/products?filter=companies&company=${encodeURIComponent(
                                c.companyName
                              )}`
                            );
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-xs cursor-pointer"
                        >
                          <span>Filter</span>
                          <FaArrowRight size={9} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500 font-medium">
                Total {companyStats.length} companies &middot; {totalProducts} products
              </span>
              <button
                type="button"
                onClick={() => setIsCompanyModalOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadProducts}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center p-8 text-center text-sm font-medium text-slate-500">
          Loading Products...
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}