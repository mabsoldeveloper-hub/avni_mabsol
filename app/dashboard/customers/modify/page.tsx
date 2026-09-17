"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
  FaEye,
  FaTimes,
  FaPhoneAlt,
  FaIdCard,
  FaEdit,
  FaSave,
  FaTimesCircle,
  FaExclamationTriangle,
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


type MrTerritoryInfo = {
  isMrRestricted: boolean;
  territories: any[];
  allowedCompanyCodes: string[];
};

interface Customer {
  _id?: string;
  CODEP?: string;
  PARNAM?: string;
  MAILNAM?: string;
  PHONE1?: string;
  CITY?: string;
  GSTNO?: string;
  DLNO?: string;
  BALANCE?: number;
  CREDIT?: number;
  STATUS?: string;
  REF?: string;
  GROUPNAME?: string;
  SCODE?: string;
  state1?: string;
  country?: string;
  ZONE?: string;
  Area?: string;
  station?: string;
  route?: string;
}

function formatCurrency(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ---------- Dynamic State -> District data ----------
// Loaded from MongoDB StateDistrict collection through /api/master/state-district.
// Existing customer State/District values are preserved in the dropdown even if
// that value is not currently present in the master collection.
type StateDistrictItem = {
  state: string;
  districts: string[];
};

// Territory masters loaded from SALETYPE through /api/master/territory.
type TerritoryMasters = {
  zone: string[];
  area: string[];
  station: string[];
  route: string[];
};

const EMPTY_TERRITORY_MASTERS: TerritoryMasters = {
  zone: [],
  area: [],
  station: [],
  route: [],
};

// A field is considered "missing" if it is empty/undefined/whitespace-only.
function isMissing(v?: string | null) {
  return !v || !String(v).trim();
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

// ---------- Party (Customer) Details Modal ----------
function CustomerDetailModal({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  if (!customer) return null;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Code", value: customer.CODEP || "-" },
    { label: "Party Name", value: customer.PARNAM || "-" },
    { label: "Mailing Name", value: customer.MAILNAM || "-" },
    { label: "Phone", value: customer.PHONE1 || "-" },
    { label: "State", value: customer.state1 || customer.REF || "-" },
    { label: "Country", value: customer.country || "India" },
    { label: "Zone", value: customer.ZONE || "-" },
    { label: "City / District", value: customer.CITY || "-" },
    { label: "Area", value: customer.Area || "-" },
    { label: "Station", value: customer.station || "-" },
    { label: "Route", value: customer.route || "-" },
    { label: "GST No.", value: customer.GSTNO || "-" },
    { label: "DL No.", value: customer.DLNO || "-" },
    { label: "Group", value: customer.GROUPNAME || "-" },
    {
      label: "Status",
      value: (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            customer.STATUS === "Y"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {customer.STATUS === "Y" ? "Active" : "Inactive"}
        </span>
      ),
    },
    { label: "Outstanding Balance", value: formatCurrency(Number(customer.BALANCE) || 0) },
    { label: "Credit Limit", value: formatCurrency(Number(customer.CREDIT) || 0) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_20px_60px_rgba(52,56,114,0.25)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent" />

        {/* Header */}
        <div className="relative flex items-center justify-between gap-3 px-6 py-4 bg-gradient-to-r from-[#343872] to-[#4a4f9e]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <FaIdCard size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold truncate">
                {customer.PARNAM || "Party Details"}
              </h3>
              <p className="text-white/70 text-xs">{customer.CODEP || ""}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="relative overflow-y-auto max-h-[calc(85vh-64px)] px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {rows.map((r) => (
              <div key={r.label} className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">
                  {r.label}
                </p>
                <div className="text-sm text-slate-800 font-medium break-words">{r.value}</div>
              </div>
            ))}
          </div>

          {customer.PHONE1 && (
            <a
              href={`tel:${customer.PHONE1}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#343872] text-white text-sm font-medium px-4 py-2.5 hover:bg-[#2a2d5c] transition-colors"
            >
              <FaPhoneAlt size={12} /> Call {customer.PHONE1}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const columnHelper = createColumnHelper<Customer>();

export default function CustomerPage() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive" | "Outstanding">("All");
  const [groupFilter, setGroupFilter] = useState("All");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
  const [stateDistricts, setStateDistricts] = useState<StateDistrictItem[]>([]);
  const [territoryMasters, setTerritoryMasters] = useState<TerritoryMasters>(EMPTY_TERRITORY_MASTERS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  // ---- inline-edit state (used to fill in missing State/Country/Zone/City/Area/Station/Route) ----
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Customer | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);


  useEffect(() => {
    loadMrTerritoryInfo();
    loadStateDistricts();
    loadTerritoryMasters();
  }, []);

  useEffect(() => {
    loadCustomers();
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

  const loadStateDistricts = async () => {
    try {
      const res = await fetch("/api/master/state-district", {
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Failed to load StateDistrict master");
        setStateDistricts([]);
        return;
      }

      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setStateDistricts(
          json.data.map((item: any) => ({
            state: String(item.state || "").trim(),
            districts: Array.isArray(item.districts)
              ? item.districts.map((d: any) => String(d || "").trim()).filter(Boolean)
              : [],
          })).filter((item: StateDistrictItem) => item.state)
        );
      } else {
        setStateDistricts([]);
      }
    } catch (error) {
      console.error("Error loading StateDistrict master:", error);
      setStateDistricts([]);
    }
  };

  const loadTerritoryMasters = async () => {
    try {
      const res = await fetch("/api/master/territory", { cache: "no-store" });
      if (!res.ok) {
        console.error("Failed to load territory masters");
        setTerritoryMasters(EMPTY_TERRITORY_MASTERS);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        const normalize = (value: any) =>
          Array.isArray(value)
            ? value.map((v: any) => String(v?.name ?? v?.SNAME ?? v ?? "").trim()).filter(Boolean)
            : [];

        setTerritoryMasters({
          zone: normalize(json.data.zone),
          area: normalize(json.data.area),
          station: normalize(json.data.station),
          route: normalize(json.data.route),
        });
      } else {
        setTerritoryMasters(EMPTY_TERRITORY_MASTERS);
      }
    } catch (error) {
      console.error("Error loading territory masters:", error);
      setTerritoryMasters(EMPTY_TERRITORY_MASTERS);
    }
  };

  const territoryOptions = (type: keyof TerritoryMasters, current?: string) =>
    Array.from(new Set([...(territoryMasters[type] || []), current || ""].filter(Boolean)));

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);
      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => {
    const arr = customers.map((c) => c.GROUPNAME).filter(Boolean) as string[];
    return ["All", ...Array.from(new Set(arr))];
  }, [customers]);

  const isRowIncomplete = (c: Customer) =>
    isMissing(c.state1 || c.REF) ||
    isMissing(c.country) ||
    isMissing(c.CITY) ||
    isMissing(c.Area) ||
    isMissing(c.station) ||
    isMissing(c.route);

  // pre-filter by status + group (+ optional "incomplete only") - global text search handled by the table itself
  const preFiltered = useMemo(() => {
    return customers.filter((c) => {
      let matchStatus = true;
      if (statusFilter === "Active") matchStatus = c.STATUS === "Y";
      else if (statusFilter === "Inactive") matchStatus = c.STATUS !== "Y";
      else if (statusFilter === "Outstanding") matchStatus = Number(c.BALANCE) > 0;

      const matchGroup = groupFilter === "All" || c.GROUPNAME === groupFilter;
      const matchIncomplete = !onlyIncomplete || isRowIncomplete(c);
      return matchStatus && matchGroup && matchIncomplete;
    });
  }, [customers, statusFilter, groupFilter, onlyIncomplete]);

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.STATUS === "Y").length;
  const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.BALANCE) || 0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + (Number(c.CREDIT) || 0), 0);
  const incompleteCount = customers.filter(isRowIncomplete).length;

  // ---- inline edit handlers ----
  const startEdit = (c: Customer) => {
    setEditingId(c._id || c.CODEP || null);
    setEditDraft({
      ...c,
      country: c.country?.trim() || "India",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const updateDraft = (field: keyof Customer, value: string) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  // When State changes, keep the existing District if it belongs to the
  // selected state; otherwise clear it. Existing values remain selectable.
  const onStateChange = (value: string) => {
    setEditDraft((prev) => {
      if (!prev) return prev;

      const master = stateDistricts.find(
        (item) => item.state.trim().toLowerCase() === value.trim().toLowerCase()
      );

      const districtStillValid =
        !!prev.CITY &&
        !!master?.districts.some(
          (district) =>
            district.trim().toLowerCase() === String(prev.CITY || "").trim().toLowerCase()
        );

      return {
        ...prev,
        state1: value,
        REF: value,
        CITY: districtStillValid ? prev.CITY : "",
      };
    });
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    const id = editDraft._id;
    try {
      setSavingId(editingId);
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state1: editDraft.state1,
          country: editDraft.country || "India",
          ZONE: editDraft.ZONE,
          CITY: editDraft.CITY,
          Area: editDraft.Area,
          station: editDraft.station,
          route: editDraft.route,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to save party details");
      }

      // Reload from MongoDB so the table always shows the permanently saved value.
      await loadCustomers();

      setEditingId(null);
      setEditDraft(null);
    } catch (err) {
      console.error("Error saving party details:", err);
    } finally {
      setSavingId(null);
    }
  };

  // Small reusable bit: shows plain text, or "Not set" styling when the field is empty
  const DisplayValue = ({ value }: { value?: string }) =>
    isMissing(value) ? (
      <span className="inline-flex items-center gap-1 text-amber-600 text-xs italic">
        <FaExclamationTriangle size={10} /> Not set
      </span>
    ) : (
      <span>{value}</span>
    );

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
        cell: (info) => (
          <div>
            <div className="font-semibold text-slate-800">{info.getValue() || "-"}</div>
            <div className="text-xs text-slate-500">{info.row.original.MAILNAM || "No email"}</div>
          </div>
        ),
      }),

      columnHelper.accessor("country", {
        header: "Country",
        cell: (info) => {
          const c = info.row.original;
          const rowId = c._id || c.CODEP || "";
          const isEditing = editingId === rowId && editDraft;
          if (isEditing) {
            return (
              <input
                type="text"
                value={editDraft?.country || "India"}
                onChange={(e) => updateDraft("country", e.target.value)}
                placeholder="Country"
                className="w-full rounded-lg border border-[#343872]/30 bg-white text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
              />
            );
          }
          return <span>India</span>;
        },
      }),


      columnHelper.accessor((row) => row.state1 || row.REF, {
        id: "State",
        header: "State",
        cell: (info) => {
          const c = info.row.original;
          const rowId = c._id || c.CODEP || "";
          const isEditing = editingId === rowId && editDraft;
          if (isEditing) {
            return (
              <select
                value={editDraft?.state1 || editDraft?.REF || ""}
                onChange={(e) => onStateChange(e.target.value)}
                className="w-full rounded-lg border border-[#343872]/30 bg-white text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
              >
                <option value="">Select state...</option>
                {Array.from(
                  new Set([
                    ...stateDistricts.map((item) => item.state),
                    editDraft?.state1 || editDraft?.REF || "",
                  ].filter(Boolean))
                ).map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            );
          }
          return <DisplayValue value={info.getValue() as string} />;
        },
      }),
    
      columnHelper.accessor("ZONE", {
        header: "ZONE",
        cell: (info) => {
          const c = info.row.original;
          const rowId = c._id || c.CODEP || "";
          const isEditing = editingId === rowId && editDraft;
          if (isEditing) {
            return (
              <select
                value={editDraft?.ZONE || ""}
                onChange={(e) => updateDraft("ZONE", e.target.value)}
                className="w-full rounded-lg border border-[#343872]/30 bg-white text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
              >
                <option value="">Select zone...</option>
                {territoryOptions("zone", editDraft?.ZONE).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            );
          }
          return <DisplayValue value={info.getValue() as string} />;
        },
      }),
      columnHelper.accessor("CITY", {
        header: "City/DISTRICT",
        cell: (info) => {
          const c = info.row.original;
          const rowId = c._id || c.CODEP || "";
          const isEditing = editingId === rowId && editDraft;
          if (isEditing) {
            const selectedState = editDraft?.state1 || editDraft?.REF || "";
            const districtMaster = stateDistricts.find(
              (item) =>
                item.state.trim().toLowerCase() === selectedState.trim().toLowerCase()
            );

            // Keep an already-saved district selectable even if it is missing
            // from the current master collection.
            const existingDistrict = editDraft?.CITY || "";
            const districtOptions = Array.from(
              new Set([
                ...(districtMaster?.districts || []),
                existingDistrict,
              ].filter(Boolean))
            );

            return (
              <select
                value={editDraft?.CITY || ""}
                onChange={(e) => updateDraft("CITY", e.target.value)}
                disabled={!selectedState || stateDistricts.length === 0}
                className="w-full rounded-lg border border-[#343872]/30 bg-white text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#343872]/40 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {!selectedState
                    ? "Pick a state first"
                    : stateDistricts.length === 0
                    ? "Loading districts..."
                    : "Select district..."}
                </option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            );
          }
          return <DisplayValue value={info.getValue() as string} />;
        },
      }),
      columnHelper.accessor("Area", {
        header: "Area",
        cell: (info) => {
          const c = info.row.original;
          const rowId = c._id || c.CODEP || "";
          const isEditing = editingId === rowId && editDraft;
          if (isEditing) {
            return (
              <select
                value={editDraft?.Area || ""}
                onChange={(e) => updateDraft("Area", e.target.value)}
                className="w-full rounded-lg border border-[#343872]/30 bg-white text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
              >
                <option value="">Select area...</option>
                {territoryOptions("area", editDraft?.Area).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            );
          }
          return <DisplayValue value={info.getValue() as string} />;
        },
      }),
      columnHelper.accessor("station", {
        header: "station",
        cell: (info) => {
          const c = info.row.original;
          const rowId = c._id || c.CODEP || "";
          const isEditing = editingId === rowId && editDraft;
          if (isEditing) {
            return (
              <select
                value={editDraft?.station || ""}
                onChange={(e) => updateDraft("station", e.target.value)}
                className="w-full rounded-lg border border-[#343872]/30 bg-white text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
              >
                <option value="">Select station...</option>
                {territoryOptions("station", editDraft?.station).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            );
          }
          return <DisplayValue value={info.getValue() as string} />;
        },
      }),
      columnHelper.accessor("route", {
        header: "route",
        cell: (info) => {
          const c = info.row.original;
          const rowId = c._id || c.CODEP || "";
          const isEditing = editingId === rowId && editDraft;
          if (isEditing) {
            return (
              <select
                value={editDraft?.route || ""}
                onChange={(e) => updateDraft("route", e.target.value)}
                className="w-full rounded-lg border border-[#343872]/30 bg-white text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
              >
                <option value="">Select route...</option>
                {territoryOptions("route", editDraft?.route).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            );
          }
          return <DisplayValue value={info.getValue() as string} />;
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const c = info.row.original;
          const rowId = c._id || c.CODEP || "";
          const isEditing = editingId === rowId;

          if (isEditing) {
            return (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={saveEdit}
                  disabled={savingId === rowId}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <FaSave size={11} /> {savingId === rowId ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 hover:bg-slate-300 transition-colors"
                >
                  <FaTimesCircle size={11} /> Cancel
                </button>
              </div>
            );
          }

          return (
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setViewCustomer(c)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#343872]/10 text-[#343872] text-xs font-medium px-3 py-1.5 hover:bg-[#343872]/20 transition-colors"
              >
                <FaEye size={11} /> View
              </button>
              <button
                onClick={() => startEdit(c)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100/80 text-amber-700 text-xs font-medium px-3 py-1.5 hover:bg-amber-200/80 transition-colors"
              >
                <FaEdit size={11} /> Edit
              </button>
            </div>
          );
        },
      }),
    ],
    [editingId, editDraft, savingId, territoryMasters, stateDistricts]
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
          <h2 className="text-2xl font-bold text-slate-800">Customer Master</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage all customers from one place</p>
        </div>
        {/* <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#343872] text-white text-sm font-medium px-4 py-2.5 shadow-[0_4px_14px_rgba(52,56,114,0.35)] hover:bg-[#2a2d5c] transition-colors cursor-pointer"
        >
          <FaPlus size={12} /> Add Customer
        </button> */}
        <div className="flex items-center gap-2">

{/* Territory Master */}
<Link href="/dashboard/master/territory"
  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#343872] text-white text-sm font-semibold hover:opacity-90 transition-all"
>
  ⚙️ Territory Master
</Link>

{/* Refresh */}
<button
  onClick={loadCustomers}
  className="..."
>
  Refresh
</button>

{/* Add Customer */}
<button
  onClick={() => setIsAddModalOpen(true)}
  className="..."
>
  Add Customer
</button>

</div>
      </div>

      {/* KPI Cards */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Customers" value={totalCustomers} icon={<FaUsers size={18} />} tone="brand" />
        <KpiCard label="Active Customers" value={activeCustomers} icon={<FaUserCheck size={18} />} tone="positive" />
        <KpiCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={<FaWallet size={18} />} tone="negative" />
        <KpiCard label="Total Credit" value={formatCurrency(totalCredit)} icon={<FaCoins size={18} />} tone="positive" />
      </div> */}

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

          <button
            onClick={() => setOnlyIncomplete((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl text-xs font-medium px-3.5 py-2.5 border transition-colors ${
              onlyIncomplete
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white/70 text-amber-700 border-amber-200 hover:bg-amber-50"
            }`}
          >
            <FaExclamationTriangle size={11} />
            Incomplete only ({incompleteCount})
          </button>

          <div className="flex gap-2 ml-auto">
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/90 text-white text-xs font-medium px-3.5 py-2.5 hover:bg-emerald-700 transition-colors">
              <FaFileExcel size={12} /> Excel
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/90 text-white text-xs font-medium px-3.5 py-2.5 hover:bg-rose-700 transition-colors">
              <FaFilePdf size={12} /> PDF
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-slate-600/90 text-white text-xs font-medium px-3.5 py-2.5 hover:bg-slate-700 transition-colors">
              <FaPrint size={12} /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Table - liquid glass */}
      <div className="relative isolate overflow-hidden rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
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
                table.getRowModel().rows.map((row, i) => {
                  const rowId = row.original._id || row.original.CODEP || "";
                  const incomplete = isRowIncomplete(row.original);
                  const editingThisRow = editingId === rowId;
                  return (
                    <tr
                      key={row.id}
                      onDoubleClick={() => !editingThisRow && setViewCustomer(row.original)}
                      className={`border-t border-white/60 transition-colors cursor-pointer ${
                        editingThisRow
                          ? "bg-[#343872]/10"
                          : incomplete
                          ? "bg-amber-50/70 hover:bg-amber-100/70"
                          : `hover:bg-[#343872]/5 ${i % 2 === 0 ? "bg-white/20" : "bg-white/5"}`
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-middle text-slate-700">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
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

      <CustomerDetailModal
        customer={viewCustomer}
        onClose={() => setViewCustomer(null)}
      />
    </div>
  );
}