"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    ColumnDef,
} from "@tanstack/react-table";
import {
    FaUsers,
    FaUserCheck,
    FaWallet,
    FaCoins,
    FaSearch,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaChevronLeft,
    FaChevronRight,
    FaFileExcel,
    FaFilter,
    FaUndo,
    FaArrowRight,
    FaMapMarkerAlt,
    FaBuilding,
} from "react-icons/fa";

type Customer = Record<string, any>;

const columnHelper = createColumnHelper<Customer>();

/* ---------------------------------------------------------- */
/* Helpers                                                     */
/* ---------------------------------------------------------- */

const money = (v: any) =>
    `₹ ${Number(v || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
    })}`;

function balanceClasses(balance: number) {
    if (balance > 0)
        return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
    if (balance < 0)
        return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
    return "bg-slate-500/15 text-slate-600 ring-slate-500/30";
}

const fmtDate = (v: any) => {
    if (!v) return "-";

    const d = new Date(v);

    if (isNaN(d.getTime())) return String(v);

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

/* ---------------------------------------------------------- */
/* Field configuration                                         */
/* ---------------------------------------------------------- */

type FieldType = "text" | "money" | "date" | "status" | "balance";

type FieldDef = {
    key: string;
    label: string;
    type?: FieldType;
};

const FIELD_GROUPS: { label: string; fields: FieldDef[] }[] = [
    {
        label: "Basic Information",
        fields: [
            { key: "PARNAM", label: "Customer Name" },
            { key: "STATUS", label: "Status", type: "status" },
        ],
    },
    {
        label: "Contact Details",
        fields: [
            { key: "PHONE4", label: "Phone " },
        ],
    },
    {
        label: "Address",
        fields: [
            { key: "PARADD", label: "Address Line 1" },
            { key: "PARADD1", label: "Address Line 2" },
            { key: "PARADD2", label: "Address Line 3" },
            { key: "CITY", label: "City" },
            { key: "AREA", label: "Area" },
        ],
    },
   
    {
        label: "Staff & Route",
        fields: [
            { key: "DSM", label: "DSM" },
            { key: "RSM", label: "RSM" },
            { key: "ASM", label: "ASM" },
            { key: "ROUT", label: "Route" },
            { key: "MR", label: "MR" },
            { key: "HQT", label: "Headquarter" },
        ],
    },
   
];

const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);


/* ---------------------------------------------------------- */
/* KPI chip                                                     */
/* ---------------------------------------------------------- */

function StatChip({
    label,
    value,
    tone,
}: {
    label: string;
    value: string | number;
    tone: string;
}) {
    return (
        <div className="flex items-center gap-2 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <span className={`h-2 w-2 rounded-full ${tone}`} />
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className="text-sm font-semibold text-gray-700 tabular-nums">
                {value}
            </span>
        </div>
    );
}

/* ---------------------------------------------------------- */
/* Main page                                                    */
/* ---------------------------------------------------------- */

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: {
        companyCode: string;
        companyName: string;
        divisionCode: string;
        divisionName: string;
        subDivisionCode: string;
        subDivisionName: string;
        categoryCode: string;
        categoryName: string;
    }[];
    allowedCompanyCodes: string[];
};

export default function CustomerFullViewPage() {
    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [mrTerritoryInfo, setMrTerritoryInfo] =
        useState<MrTerritoryInfo | null>(null);


    const [mrUserIds, setMrUserIds] = useState<Record<string, string>>({});
    const [mrSyncLoading, setMrSyncLoading] = useState<Record<string, boolean>>({});

    const [showFilters, setShowFilters] = useState(true);

    /* ---------------------------------------------------------- */
    /* Filters                                                     */
    /* ---------------------------------------------------------- */

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [city, setCity] = useState("");
    const [dsm, setDsm] = useState("");
    const [rsm, setRsm] = useState("");
    const [balanceStatus, setBalanceStatus] = useState("");
    const [gstStatus, setGstStatus] = useState("");
    const [salesActivity, setSalesActivity] = useState("");
    const [minBalance, setMinBalance] = useState("");
    const [maxBalance, setMaxBalance] = useState("");
    const [minSales, setMinSales] = useState("");
    const [maxSales, setMaxSales] = useState("");

    /* ---------------------------------------------------------- */
    /* Load data                                                    */
    /* ---------------------------------------------------------- */

    useEffect(() => {
        loadMrTerritoryInfo();
        loadCustomers();
    }, [selectedCompany?._id, selectedFY?._id]);

    const loadMrTerritoryInfo = async () => {
        try {
            const res = await fetch("/api/mr-territory/my-territories");

            if (res.ok) {
                const data = await res.json();

                if (data.success) {
                    setMrTerritoryInfo({
                        isMrRestricted: data.isMrRestricted,
                        territories: data.territories || [],
                        allowedCompanyCodes:
                            data.allowedCompanyCodes || [],
                    });
                }
            }
        } catch {
            // Silently ignore
        }
    };

    const loadCustomers = async () => {
        setLoading(true);

        try {
            const params = new URLSearchParams();

            if (selectedCompany?._id) {
                params.set("companyId", selectedCompany._id);
            }

            if (selectedFY?._id) {
                params.set("fyId", selectedFY._id);
            }

            const res = await fetch(
                `/api/master/customer?${params.toString()}`
            );

            const data = await res.json();

            setCustomers(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    const loadMrUsers = async () => {
        try {
            const res = await fetch("/api/users/mr", {
                method: "GET",
                cache: "no-store",
            });
    
            const data = await res.json();
    
            if (res.ok && data.success) {
                setMrUserIds(data.mrUserIds || {});
            }
        } catch (error) {
            console.error("Failed to load MR users:", error);
        }
    };

    useEffect(() => {
        loadMrUsers();
    }, []);

    const handleMrCheckbox = async (
        customer: any,
        isChecked: boolean
    ) => {
        if (!isChecked) {
            return;
        }
    
        const customerId = String(
            customer._id || customer.id || ""
        ).trim();
    
        if (!customerId) {
            alert("Customer ID not found.");
            return;
        }
    
        // Already added - do nothing
        if (mrUserIds[customerId]) {
            return;
        }
    
        setMrSyncLoading((prev) => ({
            ...prev,
            [customerId]: true,
        }));
    
        try {
            const res = await fetch("/api/users/mr", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                cache: "no-store",
                body: JSON.stringify({
                    customerId,
                }),
            });
    
            // JSON parsing ko safe banaya
            const responseText = await res.text();
    
            let data: any = {};
    
            if (responseText.trim()) {
                try {
                    data = JSON.parse(responseText);
                } catch {
                    throw new Error(
                        `Server returned invalid response (${res.status}).`
                    );
                }
            }
    
            if (!res.ok || !data.success) {
                throw new Error(
                    data.error ||
                    `Failed to add MR. Server status: ${res.status}`
                );
            }
    
            /*
             * IMPORTANT:
             * POST successful hote hi local mapping update karo.
             * Isse checkbox immediately checked rahega.
             */
            if (data.user?._id) {
                setMrUserIds((prev) => ({
                    ...prev,
                    [customerId]: String(data.user._id),
                }));
            } else {
                // Agar API user object na bheje lekin success true ho
                // to bhi customer ko checked state me rakhenge.
                setMrUserIds((prev) => ({
                    ...prev,
                    [customerId]: customerId,
                }));
            }
    
            // IMPORTANT:
            // Yahan loadMrUsers() CALL MAT KARNA.
            // Ye newly updated mapping ko overwrite kar sakta hai.
    
        } catch (error: any) {
            console.error(
                "MR add error:",
                error
            );
    
            alert(
                error?.message ||
                "Failed to add MR."
            );
        } finally {
            setMrSyncLoading((prev) => {
                const next = { ...prev };
                delete next[customerId];
                return next;
            });
        }
    };
    /* ---------------------------------------------------------- */
    /* Distinct filter options                                     */
    /* ---------------------------------------------------------- */

    const cityOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    customers
                        .filter(
                            (c) =>
                                String(c.SCODE || "")
                                    .trim()
                                    .toUpperCase() === "D32"
                        )
                        .map((c) => c.CITY)
                        .filter(Boolean)
                )
            ).sort(),
        [customers]
    );

    const dsmOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    customers
                        .filter(
                            (c) =>
                                String(c.SCODE || "")
                                    .trim()
                                    .toUpperCase() === "D32"
                        )
                        .map((c) => c.DSM)
                        .filter(Boolean)
                )
            ).sort(),
        [customers]
    );

    const rsmOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    customers
                        .filter(
                            (c) =>
                                String(c.SCODE || "")
                                    .trim()
                                    .toUpperCase() === "D32"
                        )
                        .map((c) => c.RSM)
                        .filter(Boolean)
                )
            ).sort(),
        [customers]
    );

    /* ---------------------------------------------------------- */
    /* Reset filters                                               */
    /* ---------------------------------------------------------- */

    const resetFilters = () => {
        setSearch("");
        setStatus("");
        setCity("");
        setDsm("");
        setRsm("");
        setBalanceStatus("");
        setGstStatus("");
        setSalesActivity("");
        setMinBalance("");
        setMaxBalance("");
        setMinSales("");
        setMaxSales("");
    };

    /* ---------------------------------------------------------- */
    /* Filtering                                                    */
    /* ---------------------------------------------------------- */

    const filtered = useMemo(() => {
        const s = search.toLowerCase();

        return customers.filter((c) => {
            /* ======================================================
               IMPORTANT:
               ONLY FIELD STAFF / MR WITH SCODE = D32
               ====================================================== */

            const scode = String(c.SCODE || "")
                .trim()
                .toUpperCase();

            if (scode !== "D32") {
                return false;
            }

            const bal = Number(c.BALANCE || 0);
            const sales = Number(c.TOTALSALES || 0);

            /* Search */

            if (
                s &&
                !(
                    (c.PARNAM || "")
                        .toString()
                        .toLowerCase()
                        .includes(s) ||
                    (c.MAILNAM || "")
                        .toString()
                        .toLowerCase()
                        .includes(s) ||
                    String(c.ORDNO || "")
                        .toLowerCase()
                        .includes(s) ||
                    (c.GSTNO || "")
                        .toString()
                        .toLowerCase()
                        .includes(s) ||
                    (c.PHONE1 || "")
                        .toString()
                        .toLowerCase()
                        .includes(s) ||
                    (c.CITY || "")
                        .toString()
                        .toLowerCase()
                        .includes(s)
                )
            ) {
                return false;
            }

            /* Status */

            if (status && c.STATUS !== status) {
                return false;
            }

            /* City */

            if (city && c.CITY !== city) {
                return false;
            }

            /* DSM */

            if (dsm && c.DSM !== dsm) {
                return false;
            }

            /* RSM */

            if (rsm && c.RSM !== rsm) {
                return false;
            }

            /* Balance */

            if (
                balanceStatus === "outstanding" &&
                !(bal > 0)
            ) {
                return false;
            }

            if (
                balanceStatus === "credit" &&
                !(bal < 0)
            ) {
                return false;
            }

            if (
                balanceStatus === "zero" &&
                bal !== 0
            ) {
                return false;
            }

            /* GST */

            if (gstStatus === "with" && !c.GSTNO) {
                return false;
            }

            if (gstStatus === "without" && c.GSTNO) {
                return false;
            }

            /* Sales activity */

            if (
                salesActivity === "with_sales" &&
                !(sales > 0)
            ) {
                return false;
            }

            if (
                salesActivity === "no_sales" &&
                sales > 0
            ) {
                return false;
            }

            /* Balance range */

            if (
                minBalance &&
                bal < Number(minBalance)
            ) {
                return false;
            }

            if (
                maxBalance &&
                bal > Number(maxBalance)
            ) {
                return false;
            }

            /* Sales range */

            if (
                minSales &&
                sales < Number(minSales)
            ) {
                return false;
            }

            if (
                maxSales &&
                sales > Number(maxSales)
            ) {
                return false;
            }

            return true;
        });
    }, [
        customers,
        search,
        status,
        city,
        dsm,
        rsm,
        balanceStatus,
        gstStatus,
        salesActivity,
        minBalance,
        maxBalance,
        minSales,
        maxSales,
    ]);

    /* ---------------------------------------------------------- */
    /* KPI                                                          */
    /* ---------------------------------------------------------- */

    const totalCount = filtered.length;

    const activeCount = filtered.filter(
        (c) => c.STATUS === "Y"
    ).length;

    const totalOutstanding = filtered.reduce(
        (sum, c) =>
            sum + Math.max(Number(c.BALANCE || 0), 0),
        0
    );

    const totalSalesSum = filtered.reduce(
        (sum, c) =>
            sum + Number(c.TOTALSALES || 0),
        0
    );

    /* ---------------------------------------------------------- */
    /* Columns                                                       */
    /* ---------------------------------------------------------- */

    const columns = useMemo(() => {
        const cols: ColumnDef<Customer, any>[] = [];

        cols.push(
            columnHelper.display({
                id: "mrSelect",
                header: "Add to Users",
                enableSorting: false,
                cell: (info) => {
                    const customer = info.row.original;
                    const customerId = String(customer._id || "").trim();
                    const checked = !!mrUserIds[customerId];
                    const syncing = !!mrSyncLoading[customerId];

                    return (
                        <div className="flex items-center justify-center">
                           <input
                                type="checkbox"
                                checked={checked}
                                disabled={syncing}
                                onChange={(e) => {
                                    // Once added to Users, keep checkbox checked.
                                    if (checked) return;

                                    if (!e.target.checked) return;

                                    handleMrCheckbox(customer, true);
                                }}
                                title={
                                    checked
                                        ? "Already added to Users"
                                        : "Add MR to Users"
                                }
                                className="h-4 w-4 rounded border-gray-300 text-[#343872] focus:ring-[#343872] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                            />
                            {syncing && (
                                <span className="ml-1 text-[10px] text-indigo-500">
                                    ...
                                </span>
                            )}
                        </div>
                    );
                },
            })
        );

        ALL_FIELDS.forEach((f) => {
            cols.push(
                columnHelper.accessor(f.key, {
                    id: f.key,
                    header: f.label,

                    cell: (info) => {
                        const val = info.getValue();

                        if (f.type === "money") {
                            return money(val);
                        }

                        if (f.type === "date") {
                            return fmtDate(val);
                        }

                        if (f.type === "status") {
                            return val === "Y" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30">
                                    Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30">
                                    Inactive
                                </span>
                            );
                        }

                        if (f.type === "balance") {
                            const n = Number(val || 0);

                            return (
                                <span
                                    className={`inline-flex items-center justify-center min-w-[5rem] px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${balanceClasses(
                                        n
                                    )}`}
                                >
                                    {money(n)}
                                </span>
                            );
                        }

                        return val === undefined ||
                            val === null ||
                            val === ""
                            ? "-"
                            : String(val);
                    },
                })
            );
        });

        cols.push(
            columnHelper.display({
                id: "action",
                header: "Action",

                cell: (info) => (
                    <div className="flex gap-1.5">
                        <Link
                            href={`/dashboard/customers/view/${info.row.original._id}`}
                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-white/50 text-blue-600 ring-1 ring-blue-500/30 hover:bg-blue-500 hover:text-white hover:ring-blue-500 transition-all duration-200"
                        >
                            View
                        </Link>

                        <Link
                            href={`/dashboard/customers/ledger/${info.row.original._id}`}
                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-white/50 text-emerald-600 ring-1 ring-emerald-500/30 hover:bg-emerald-500 hover:text-white hover:ring-emerald-500 transition-all duration-200"
                        >
                            Ledger
                        </Link>
                    </div>
                ),
            })
        );

        return cols;
    }, [mrUserIds, mrSyncLoading]);

    const numericTypes = new Set(
        ALL_FIELDS.filter(
            (f) =>
                f.type === "money" ||
                f.type === "balance"
        ).map((f) => f.key)
    );

    /* ---------------------------------------------------------- */
    /* Table                                                         */
    /* ---------------------------------------------------------- */

    const table = useReactTable({
        data: filtered,
        columns,

        state: {
            sorting,
        },

        onSortingChange: setSorting,

        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),

        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    /* ---------------------------------------------------------- */
    /* Excel export                                                  */
    /* ---------------------------------------------------------- */

    const exportToExcel = () => {
        const exportCols = ALL_FIELDS;

        const rows =
            table.getFilteredRowModel().rows.map(
                (row) => {
                    const obj: Record<string, any> = {};

                    ALL_FIELDS.forEach((field) => {
                        const col = table.getColumn(field.key);
                        if (!col) return;

                        const header =
                            typeof col.columnDef.header === "string"
                                ? col.columnDef.header
                                : col.id;

                        obj[header] = row.getValue(col.id);
                    });

                    return obj;
                }
            );

        const ws = XLSX.utils.json_to_sheet(rows);

        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            wb,
            ws,
            "MR Field Staff"
        );

        XLSX.writeFile(
            wb,
            `mr_field_staff_D32_${Date.now()}.xlsx`
        );
    };

    /* ---------------------------------------------------------- */
    /* UI                                                            */
    /* ---------------------------------------------------------- */

    return (
        <div className="space-y-4">

            {/* ==================== MR TERRITORY BANNER ==================== */}

            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">

                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt
                            size={16}
                            className="text-amber-500"
                        />
                    </div>

                    <div className="flex-1 min-w-0">

                        <p className="text-xs font-semibold text-amber-800 mb-0.5">
                            Territory Restricted View
                        </p>

                        <p className="text-[11px] text-amber-700 leading-relaxed">

                            Aap sirf apni assigned territory ke
                            MR / Field Staff customers dekh sakte hain.

                            {mrTerritoryInfo.territories.length >
                                0 && (
                                <>
                                    {" "}
                                    Assigned:
                                    {" "}
                                    {Array.from(
                                        new Set(
                                            mrTerritoryInfo.territories.map(
                                                (t) =>
                                                    t.companyName ||
                                                    t.companyCode
                                            )
                                        )
                                    ).join(", ")}
                                </>
                            )}

                        </p>

                        {mrTerritoryInfo.territories.length >
                            0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">

                                {mrTerritoryInfo.territories.map(
                                    (t, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium border border-amber-200"
                                        >
                                            <FaBuilding size={8} />

                                            {t.companyName ||
                                                t.companyCode}

                                            {t.divisionName ? (
                                                <>
                                                    {" "}
                                                    <FaArrowRight
                                                        size={7}
                                                        className="opacity-50"
                                                    />{" "}
                                                    {t.divisionName}
                                                </>
                                            ) : null}

                                            {t.subDivisionName ? (
                                                <>
                                                    {" "}
                                                    <FaArrowRight
                                                        size={7}
                                                        className="opacity-50"
                                                    />{" "}
                                                    {
                                                        t.subDivisionName
                                                    }
                                                </>
                                            ) : null}

                                            {t.categoryName ? (
                                                <>
                                                    {" "}
                                                    <FaArrowRight
                                                        size={7}
                                                        className="opacity-50"
                                                    />{" "}
                                                    {
                                                        t.categoryName
                                                    }
                                                </>
                                            ) : null}
                                        </span>
                                    )
                                )}

                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* ==================== MR ONLY BANNER ==================== */}

            <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 shadow-sm">

                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-600 text-white">
                    <FaUserCheck size={16} />
                </div>

                <div>
                    <p className="text-xs font-bold text-indigo-800">
                        MR / Field Staff View
                    </p>
                </div>

            </div>

            {/* ==================== STAT STRIP ==================== */}

            <div className="flex flex-wrap gap-2">

                <StatChip
                    label="MR / Field Staff"
                    value={totalCount}
                    tone="bg-blue-500"
                />

                <StatChip
                    label="Active"
                    value={activeCount}
                    tone="bg-emerald-500"
                />

                <StatChip
                    label="Outstanding"
                    value={money(totalOutstanding)}
                    tone="bg-rose-500"
                />

                <StatChip
                    label="Total Sales"
                    value={money(totalSalesSum)}
                    tone="bg-indigo-500"
                />


            </div>

            {/* ==================== MAIN CARD ==================== */}

            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">

                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* Header */}

                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#343872]/90 to-indigo-600/85 backdrop-blur-md">

                    <div className="flex items-center gap-2">

                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white">
                            <FaUsers size={14} />
                        </div>

                        <h5 className="text-sm font-semibold text-white tracking-wide m-0">
                            MR / Field Staff — Customer Full View
                        </h5>

                    </div>

                    <div className="flex flex-wrap items-center gap-2">

                        <div className="relative w-full sm:w-56">

                            <FaSearch
                                size={12}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                                placeholder="Search MR, code, GST, phone, city..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all duration-200"
                            />

                        </div>

                        <button
                            onClick={() =>
                                setShowFilters((v) => !v)
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 transition-all duration-200"
                        >
                            <FaFilter size={11} />
                            Filters
                        </button>


                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white ring-1 ring-emerald-400 hover:bg-emerald-600 transition-all duration-200"
                        >
                            <FaFileExcel size={12} />
                            Export Excel
                        </button>

                    </div>
                </div>

                {/* ==================== FILTERS ==================== */}

                {showFilters && (
                    <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-3 bg-white/40 border-b border-gray-200/60">

                        {/* Status */}

                        <select
                            value={status}
                            onChange={(e) =>
                                setStatus(e.target.value)
                            }
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">
                                All Status
                            </option>

                            <option value="Y">
                                Active
                            </option>

                            <option value="N">
                                Inactive
                            </option>
                        </select>

                        {/* City */}

                        <select
                            value={city}
                            onChange={(e) =>
                                setCity(e.target.value)
                            }
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">
                                All Cities
                            </option>

                            {cityOptions.map((c) => (
                                <option
                                    key={c}
                                    value={c}
                                >
                                    {c}
                                </option>
                            ))}
                        </select>

                        {/* DSM */}

                        <select
                            value={dsm}
                            onChange={(e) =>
                                setDsm(e.target.value)
                            }
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">
                                All DSM
                            </option>

                            {dsmOptions.map((d) => (
                                <option
                                    key={d}
                                    value={d}
                                >
                                    {d}
                                </option>
                            ))}
                        </select>

                        {/* RSM */}

                        <select
                            value={rsm}
                            onChange={(e) =>
                                setRsm(e.target.value)
                            }
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">
                                All RSM
                            </option>

                            {rsmOptions.map((r) => (
                                <option
                                    key={r}
                                    value={r}
                                >
                                    {r}
                                </option>
                            ))}
                        </select>

                        {/* Balance */}

                        <select
                            value={balanceStatus}
                            onChange={(e) =>
                                setBalanceStatus(e.target.value)
                            }
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">
                                All Balance
                            </option>

                            <option value="outstanding">
                                Outstanding
                            </option>

                            <option value="credit">
                                Credit
                            </option>

                            <option value="zero">
                                Zero
                            </option>
                        </select>

                        {/* GST */}

                        <select
                            value={gstStatus}
                            onChange={(e) =>
                                setGstStatus(e.target.value)
                            }
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">
                                GST Status
                            </option>

                            <option value="with">
                                With GST
                            </option>

                            <option value="without">
                                Without GST
                            </option>
                        </select>

                        {/* Sales Activity */}

                        <select
                            value={salesActivity}
                            onChange={(e) =>
                                setSalesActivity(e.target.value)
                            }
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">
                                Sales Activity
                            </option>

                            <option value="with_sales">
                                With Sales
                            </option>

                            <option value="no_sales">
                                No Sales
                            </option>
                        </select>

                        {/* Minimum Balance */}

                        <input
                            type="number"
                            value={minBalance}
                            onChange={(e) =>
                                setMinBalance(e.target.value)
                            }
                            placeholder="Min Balance"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />

                        {/* Maximum Balance */}

                        <input
                            type="number"
                            value={maxBalance}
                            onChange={(e) =>
                                setMaxBalance(e.target.value)
                            }
                            placeholder="Max Balance"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />

                        {/* Minimum Sales */}

                        <input
                            type="number"
                            value={minSales}
                            onChange={(e) =>
                                setMinSales(e.target.value)
                            }
                            placeholder="Min Sales"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />

                        {/* Maximum Sales */}

                        <input
                            type="number"
                            value={maxSales}
                            onChange={(e) =>
                                setMaxSales(e.target.value)
                            }
                            placeholder="Max Sales"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />

                        {/* Reset */}

                        <button
                            onClick={resetFilters}
                            className="flex items-center justify-center gap-1.5 text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 hover:bg-gray-100 transition-all"
                        >
                            <FaUndo size={10} />
                            Reset
                        </button>

                    </div>
                )}

                {/* ==================== TABLE ==================== */}

                <div className="relative overflow-x-auto">

                    <table className="w-full text-sm">

                        <thead>

                            {table.getHeaderGroups().map(
                                (headerGroup) => (
                                    <tr
                                        key={headerGroup.id}
                                        className="border-b border-gray-200/70 bg-white/30"
                                    >

                                        {headerGroup.headers.map(
                                            (header) => {
                                                const sortDir =
                                                    header.column.getIsSorted();

                                                const isNumeric =
                                                    numericTypes.has(
                                                        header.column.id
                                                    );

                                                return (
                                                    <th
                                                        key={header.id}
                                                        onClick={header.column.getToggleSortingHandler()}
                                                        className={`select-none cursor-pointer whitespace-nowrap px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide ${
                                                            isNumeric
                                                                ? "text-right"
                                                                : "text-left"
                                                        } hover:text-gray-700 transition-colors`}
                                                    >

                                                        <span
                                                            className={`inline-flex items-center gap-1 ${
                                                                isNumeric
                                                                    ? "flex-row-reverse"
                                                                    : ""
                                                            }`}
                                                        >

                                                            {flexRender(
                                                                header.column
                                                                    .columnDef
                                                                    .header,
                                                                header.getContext()
                                                            )}

                                                            {header.column.getCanSort() &&
                                                                (sortDir ===
                                                                "asc" ? (
                                                                    <FaSortUp
                                                                        size={
                                                                            11
                                                                        }
                                                                        className="text-slate-500"
                                                                    />
                                                                ) : sortDir ===
                                                                  "desc" ? (
                                                                    <FaSortDown
                                                                        size={
                                                                            11
                                                                        }
                                                                        className="text-slate-500"
                                                                    />
                                                                ) : (
                                                                    <FaSort
                                                                        size={
                                                                            10
                                                                        }
                                                                        className="text-gray-300"
                                                                    />
                                                                ))}

                                                        </span>

                                                    </th>
                                                );
                                            }
                                        )}

                                    </tr>
                                )
                            )}

                        </thead>

                        <tbody>

                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="text-center text-gray-400 py-10 text-sm"
                                    >
                                        Loading MR / Field Staff...
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.length >
                              0 ? (
                                table
                                    .getRowModel()
                                    .rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                                        >

                                            {row
                                                .getVisibleCells()
                                                .map(
                                                    (cell) => {
                                                        const isNumeric =
                                                            numericTypes.has(
                                                                cell.column
                                                                    .id
                                                            );

                                                        return (
                                                            <td
                                                                key={
                                                                    cell.id
                                                                }
                                                                className={`px-4 py-2.5 whitespace-nowrap text-gray-600 tabular-nums ${
                                                                    isNumeric
                                                                        ? "text-right"
                                                                        : "text-left"
                                                                }`}
                                                            >
                                                                {flexRender(
                                                                    cell
                                                                        .column
                                                                        .columnDef
                                                                        .cell,
                                                                    cell.getContext()
                                                                )}
                                                            </td>
                                                        );
                                                    }
                                                )}

                                        </tr>
                                    ))
                            ) : (
                                <tr>

                                    <td
                                        colSpan={columns.length}
                                        className="text-center text-gray-400 py-10 text-sm"
                                    >
                                        No MR / Field Staff found
                                    </td>

                                </tr>
                            )}

                        </tbody>

                    </table>

                </div>

                {/* ==================== PAGINATION ==================== */}

                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">

                    <span>

                        Page{" "}

                        <span className="font-semibold text-gray-700">
                            {table.getState().pagination.pageIndex +
                                1}
                        </span>{" "}

                        of{" "}

                        <span className="font-semibold text-gray-700">
                            {table.getPageCount() || 1}
                        </span>{" "}

                        &middot;{" "}

                        {table
                            .getFilteredRowModel()
                            .rows.length}{" "}
                        results

                    </span>

                    <div className="flex items-center gap-1.5">

                        <button
                            onClick={() =>
                                table.setPageIndex(0)
                            }
                            disabled={
                                !table.getCanPreviousPage()
                            }
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            First
                        </button>

                        <button
                            onClick={() =>
                                table.previousPage()
                            }
                            disabled={
                                !table.getCanPreviousPage()
                            }
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronLeft size={10} />
                        </button>

                        <button
                            onClick={() =>
                                table.nextPage()
                            }
                            disabled={
                                !table.getCanNextPage()
                            }
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronRight size={10} />
                        </button>

                        <button
                            onClick={() =>
                                table.setPageIndex(
                                    table.getPageCount() - 1
                                )
                            }
                            disabled={
                                !table.getCanNextPage()
                            }
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            Last
                        </button>

                    </div>

                </div>

            </div>

            {/* ==================== NEXT STEP FOOTER ==================== */}

            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-sm p-4">

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">

                    

                    <Link
                        href="/dashboard/master/mr-territory"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
                    >
                        Next Step: Salesman (MR)
                        <FaArrowRight size={12} />
                    </Link>

                </div>

            </div>

        </div>
    );
}