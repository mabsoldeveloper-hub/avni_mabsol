"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FaUsers,
  FaUserCheck,
  FaWallet,
  FaCoins,
  FaSearch,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaBuilding,
  FaMapMarkerAlt,
  FaArrowRight,
} from "react-icons/fa";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import AddCustomerModal from "@/components/customer/AddCustomerModal";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";

import PermissionButton from "@/components/PermissionButton";


type MrTerritoryInfo = {
  isMrRestricted: boolean;
  territories: any[];
  allowedCompanyCodes: string[];
};

interface YearBreakdownItem {
  fyCode: string;
  fyName: string;
  balance: number;
  _id?: string;
  _vfpTable?: string;
}

interface Customer {
  _id?: string;
  CODEP?: string;
  PARNAM?: string;
  MAILNAM?: string;
  PHONE1?: string;
  PHONE2?: string;
  CITY?: string;
  GSTNO?: string;
  DLNO?: string;
  BALANCE?: number;
  CREDIT?: number;
  DUEDAYS?: number;
  DAYS?: number;
  BILL_LIMIT?: number | string;
  BILLLIMIT?: number | string;
  MAXBILLS?: number | string;
  STATUS?: string;
  REF?: string;
  GROUPNAME?: string;
  SCODE?: string;
  fyCode?: string;
  fyName?: string;
  yearsCount?: number;
  yearBreakdown?: YearBreakdownItem[];
  _allIds?: string[];
}

function formatCurrency(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ---------- KPI card (liquid glass, brand-color family) ----------
function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "brand" | "positive" | "negative" | "neutral";
}) {
  const toneMap = {
    brand: { text: "text-[#343872]", glow: "from-[#343872]/30" },
    positive: { text: "text-emerald-700", glow: "from-emerald-400/30" },
    negative: { text: "text-rose-700", glow: "from-rose-400/30" },
    neutral: { text: "text-slate-700", glow: "from-slate-400/25" },
  }[tone];

  return (
    <div
      className="
                group relative isolate overflow-hidden rounded-2xl
                bg-white/50 backdrop-blur-xl backdrop-saturate-150
                border border-white/60 ring-1 ring-white/40
                shadow-[0_8px_32px_rgba(52,56,114,0.10)]
                transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(52,56,114,0.16)]
                p-5
            "
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent" />
      <div
        className={`pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${toneMap.glow} to-transparent blur-2xl opacity-70 transition-all duration-700 group-hover:scale-125`}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 mb-1 tracking-wide">{label}</p>
          <h3 className="text-2xl font-bold text-slate-800 truncate">{value}</h3>
        </div>
        <div
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-white/70 backdrop-blur-md border border-white/70 shadow-sm ${toneMap.text}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

const columnHelper = createColumnHelper<Customer>();

export default function CustomerPage() {
  const params = useParams();
  const role = (params?.role as string) || "admin";
  const { selectedCompany } = useCompany();
  const { fyList, selectedFY, setSelectedFY } = useFinancialYear();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive" | "Outstanding">("All");
  const [groupFilter, setGroupFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"consolidated" | "yearwise">("consolidated");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadMrTerritoryInfo();
  }, []);

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

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);
      if (viewMode === "yearwise") {
        params.set("mergeYears", "false");
      } else {
        params.set("mergeYears", "true");
      }
      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [selectedCompany?._id, selectedFY?._id, viewMode]);

  const groups = useMemo(() => {
    const arr = customers.map((c) => c.GROUPNAME).filter(Boolean) as string[];
    return ["All", ...Array.from(new Set(arr))];
  }, [customers]);

  // pre-filter by status + group (global text search is handled by the table itself)
  const preFiltered = useMemo(() => {
    return customers.filter((c) => {
      let matchStatus = true;
      if (statusFilter === "Active") matchStatus = c.STATUS === "Y";
      else if (statusFilter === "Inactive") matchStatus = c.STATUS !== "Y";
      else if (statusFilter === "Outstanding") matchStatus = Number(c.BALANCE) > 0;

      const matchGroup = groupFilter === "All" || c.GROUPNAME === groupFilter;
      return matchStatus && matchGroup;
    });
  }, [customers, statusFilter, groupFilter]);

  const totalCustomers = preFiltered.length;
  const activeCustomers = preFiltered.filter((c) => c.STATUS === "Y").length;
  const totalOutstanding = preFiltered.reduce((sum, c) => sum + (Number(c.BALANCE) || 0), 0);
  const totalCredit = preFiltered.reduce((sum, c) => sum + (Number(c.CREDIT) || 0), 0);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "sno",
        header: "#",
        cell: (info) => info.row.index + 1,
        size: 48,
      }),
 
      columnHelper.accessor("PARNAM", {
        header: "Customer Name",
        cell: (info) => {
          const c = info.row.original;
          return (
            <div className="min-w-[240px] whitespace-nowrap">
              <div className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <span>{info.getValue() || "-"}</span>
                {viewMode === "consolidated" && (c.yearsCount ?? 0) > 1 && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                    title={`Merged across ${c.yearsCount} financial years`}
                  >
                    {c.yearsCount} Yrs
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{c.MAILNAM || "No email"}</div>
            </div>
          );
        },
      }),

      ...(viewMode === "yearwise"
        ? [
            columnHelper.accessor((row) => row.fyName || row.fyCode || "-", {
              id: "fyName",
              header: "Financial Year",
              cell: (info) => (
                <span className="inline-flex items-center gap-1 font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs border border-indigo-200/80 whitespace-nowrap">
                  📅 {info.getValue()}
                </span>
              ),
            }),
          ]
        : []),

      columnHelper.accessor((row) => row.PHONE1 || row.REF, {
        id: "contact",
        header: "Contact",
        cell: (info) => <span className="whitespace-nowrap">{info.getValue() || "-"}</span>,
      }),
      columnHelper.accessor("CITY", {
        header: "City",
        cell: (info) => <span className="whitespace-nowrap">{info.getValue() || "-"}</span>,
      }),
      columnHelper.accessor("GSTNO", {
        header: "GST No",
        cell: (info) => <span className="font-mono text-xs whitespace-nowrap">{info.getValue() || "-"}</span>,
      }),
      columnHelper.accessor("DLNO", {
        header: "DL No",
        cell: (info) => <span className="text-xs whitespace-nowrap">{info.getValue() || "-"}</span>,
      }),
      columnHelper.accessor("CREDIT", {
        header: "Credit Limit",
        cell: (info) => {
          const credit = Number(info.getValue() || 0);
          const balance = Number(info.row.original.BALANCE || 0);
          const isOverLimit = credit > 0 && balance > credit;

          return (
            <div className="whitespace-nowrap">
              <div className="font-semibold text-slate-800">
                {credit > 0 ? formatCurrency(credit) : <span className="text-slate-400 font-normal">₹0</span>}
              </div>
              {isOverLimit && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                  ⚠️ Over Limit
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.DUEDAYS || row.DAYS || 0, {
        id: "dayLimit",
        header: "Day Limit",
        cell: (info) => {
          const days = Number(info.getValue() || 0);
          return (
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg text-xs border border-amber-200/80 whitespace-nowrap">
              {days > 0 ? `${days} Days` : "0 Days"}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.BILL_LIMIT ?? row.BILLLIMIT ?? row.MAXBILLS ?? 5, {
        id: "billLimit",
        header: "Bill Limit",
        cell: (info) => {
          const bills = info.getValue();
          return (
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg text-xs border border-purple-200/80 whitespace-nowrap">
              {bills} Bills
            </span>
          );
        },
      }),
      columnHelper.accessor("BALANCE", {
        header: "Outstanding",
        cell: (info) => {
          const v = Number(info.getValue() || 0);
          const c = info.row.original;
          const yearBreakdown = c.yearBreakdown || [];
          const hasMultipleYears = viewMode === "consolidated" && yearBreakdown.length > 1;

          return (
            <div className="whitespace-nowrap">
              <span className={`font-semibold ${v > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {formatCurrency(v)}
              </span>
              {hasMultipleYears && (
                <div
                  className="mt-0.5"
                  title={yearBreakdown
                    .map((y) => `${y.fyName || y.fyCode}: ${formatCurrency(y.balance)}`)
                    .join(" | ")}
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/70 cursor-help">
                    {yearBreakdown.length} Yrs Merged
                  </span>
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("STATUS", {
        header: "Status",
        cell: (info) =>
          info.getValue() === "Y" ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100/80 text-emerald-700 text-xs font-medium px-2.5 py-1 ring-1 ring-emerald-300/50 whitespace-nowrap">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-rose-100/80 text-rose-700 text-xs font-medium px-2.5 py-1 ring-1 ring-rose-300/50 whitespace-nowrap">
              Inactive
            </span>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const c = info.row.original;
          return (
            <div className="flex items-center gap-1.5 justify-center whitespace-nowrap">
              <Link
                href={`/dashboard/${role}/customers/view/${c._id}`}
                className="rounded-lg bg-[#343872]/10 text-[#343872] text-xs font-semibold px-2.5 py-1.5 hover:bg-[#343872]/20 transition-colors shadow-2xs"
                title="View Customer Profile"
              >
                View
              </Link>
              <Link
                href={`/dashboard/${role}/customers/ledger/${c._id}`}
                className="rounded-lg bg-emerald-100/80 text-emerald-700 text-xs font-semibold px-2.5 py-1.5 hover:bg-emerald-200/80 transition-colors shadow-2xs"
                title="View Customer Ledger"
              >
                Ledger
              </Link>
              <Link
                href={`/dashboard/${role}/customers/edit/${c._id}`}
                className="rounded-lg bg-amber-100/80 text-amber-800 text-xs font-semibold px-2.5 py-1.5 hover:bg-amber-200/80 transition-colors shadow-2xs"
                title="Edit Customer Profile & Alert Limits"
              >
                Edit
              </Link>
              <Link
                href={`/dashboard/${role}/customers/alert/${c._id}`}
                className="rounded-lg bg-rose-100/80 text-rose-700 text-xs font-semibold px-2.5 py-1.5 hover:bg-rose-200/80 transition-colors shadow-2xs"
                title="Send Account & Payment Alert"
              >
                Alert
              </Link>
            </div>
          );
        },
      }),
    ],
    [role, viewMode]
  );

  const table = useReactTable({
    data: preFiltered,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4 sm:p-6">
      {/* ==================== MR TERRITORY BANNER ==================== */}
      {mrTerritoryInfo?.isMrRestricted && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm mb-4">
          <div className="flex-shrink-0 mt-0.5">
            <FaMapMarkerAlt size={16} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Aap sirf apni assigned territory ke customers dekh sakte hain.
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

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-slate-800">Customer Master</h2>
            {viewMode === "consolidated" ? (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Consolidated Multi-Year
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Year-wise Rows
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage all customers from one place · {viewMode === "consolidated" ? "Merged Outstanding across all financial years" : "Individual records shown year-wise"}
          </p>
        </div>

        <PermissionButton permission="customer.add.button"> 
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#343872] text-white text-sm font-medium px-4 py-2.5 shadow-[0_4px_14px_rgba(52,56,114,0.35)] hover:bg-[#2a2d5c] transition-colors cursor-pointer"
          >
            <FaPlus size={12} /> Add Customer
          </button>
        </PermissionButton> 

      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Customers" value={totalCustomers} icon={<FaUsers size={18} />} tone="brand" />
        <KpiCard label="Active Customers" value={activeCustomers} icon={<FaUserCheck size={18} />} tone="positive" />
        <KpiCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={<FaWallet size={18} />} tone="negative" />
        <KpiCard label="Total Credit" value={formatCurrency(totalCredit)} icon={<FaCoins size={18} />} tone="positive" />
      </div>

      {/* Search & Filter bar - liquid glass */}
      <div className="relative isolate overflow-hidden rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-4 mb-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by name, code, GST or phone..."
              className="w-full rounded-xl bg-white/70 border border-white/70 pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          {/* Financial Year Selector */}
          <select
            className="rounded-xl bg-white/70 border border-white/70 px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#343872]/40 cursor-pointer"
            value={selectedFY?._id || "ALL"}
            onChange={(e) => {
              const targetId = e.target.value;
              const found = fyList.find((f) => f._id === targetId);
              if (found) {
                setSelectedFY(found);
              }
            }}
            title="Filter by Financial Year"
          >
            {fyList.map((f) => (
              <option key={f._id} value={f._id}>
                {f.isAll ? "🏢 All Financial Years" : `📅 FY ${f.fyName.replace(/^FY\s*/i, "")}`}
              </option>
            ))}
          </select>

          {/* View Mode Toggle (Consolidated vs Year-wise Rows) */}
          <div className="inline-flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("consolidated")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "consolidated"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Consolidated view: merge duplicate rows across financial years with merged outstanding balance"
            >
              <span>🔗 Merged (All Years)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("yearwise")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "yearwise"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Year-wise view: show individual customer rows for each financial year"
            >
              <span>📑 Year-wise Rows</span>
            </button>
          </div>

          <select
            className="rounded-xl bg-white/70 border border-white/70 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl bg-white/70 border border-white/70 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Outstanding">Outstanding</option>
          </select>

          <div className="flex gap-2 ml-auto">

            <PermissionButton permission="customer.excel">
              <button className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/90 text-white text-xs font-medium px-3.5 py-2.5 hover:bg-emerald-700 transition-colors">
                <FaFileExcel size={12} /> Excel
              </button>
            </PermissionButton>

            <PermissionButton permission="customer.pdf">
              <button className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/90 text-white text-xs font-medium px-3.5 py-2.5 hover:bg-rose-700 transition-colors">
                <FaFilePdf size={12} /> PDF
              </button>
            </PermissionButton>

            <PermissionButton permission="customer.print">
              <button className="inline-flex items-center gap-1.5 rounded-xl bg-slate-600/90 text-white text-xs font-medium px-3.5 py-2.5 hover:bg-slate-700 transition-colors">
                <FaPrint size={12} /> Print
              </button>
            </PermissionButton>

          </div>
        </div>
      </div>

      {/* Table - liquid glass */}
      <div className="relative isolate overflow-hidden rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[1350px] text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-gradient-to-r from-[#343872] to-[#4a4f9e]">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-4 py-3 text-left text-xs font-semibold text-white/90 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          (header.column.getIsSorted() === "asc" ? (
                            <FaSortUp size={11} />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <FaSortDown size={11} />
                          ) : (
                            <FaSort size={10} className="opacity-50" />
                          ))}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-10 text-slate-500">
                    Loading customers...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-10 text-slate-400">
                    No customers found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-t border-white/60 hover:bg-[#343872]/5 transition-colors ${i % 2 === 0 ? "bg-white/20" : "bg-white/5"
                      }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle text-slate-700">
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
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/60 px-4 py-3">
          <div className="text-xs text-slate-500">
            Showing{" "}
            <b className="text-slate-700">
              {table.getRowModel().rows.length === 0
                ? 0
                : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              –
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </b>{" "}
            of <b className="text-slate-700">{table.getFilteredRowModel().rows.length}</b> customers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="inline-flex items-center gap-1 rounded-lg bg-white/70 border border-white/70 text-xs font-medium px-3 py-1.5 text-slate-600 disabled:opacity-40 hover:bg-white transition-colors"
            >
              <FaChevronLeft size={10} /> Prev
            </button>
            <span className="text-xs text-slate-500 px-1">
              Page <b className="text-slate-700">{table.getState().pagination.pageIndex + 1}</b> of{" "}
              <b className="text-slate-700">{table.getPageCount() || 1}</b>
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="inline-flex items-center gap-1 rounded-lg bg-white/70 border border-white/70 text-xs font-medium px-3 py-1.5 text-slate-600 disabled:opacity-40 hover:bg-white transition-colors"
            >
              Next <FaChevronRight size={10} />
            </button>
          </div>
        </div>
      </div>

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadCustomers}
      />
    </div>
  );
}