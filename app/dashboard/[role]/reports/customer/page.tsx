"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { FaBuilding, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";

interface CustomerRow {
    ORDNO: string;
    SCODE?: string;
    CODEP?: string;
    PARNAM: string;
    CITY?: string;
    AREA?: string | null;
    ROUT?: string | null;
    DSM?: string | null;
    STATUS?: string;
    BALANCE?: number;
    DUEDAYS?: number;
    PHONE1?: string;
    PHONE2?: string;
    GSTNO?: string;
    DLNO?: string;

    // Pend
    outstandingAmount?: number;
    pendingVouchers?: number;
    lastDueDate?: string | null;

    // GlLedger
    totalDebit?: number;
    totalCredit?: number;
    ledgerBalance?: number;
    lastTransactionDate?: string | null;

    // MaOrder
    maOrderBalance?: number;
    maOrderCount?: number;
    lastMaOrderDate?: string | null;
    maOrderForm?: string | null;
}

interface MasterReportData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    rows: CustomerRow[];
}

interface ApiResponse {
    success: boolean;
    data?: MasterReportData;
    message?: string;
}

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

const DEFAULT_FILTERS = {
    search: "",
    area: "",
    route: "",
    dsm: "",
    status: "",
};

const LIMIT = 500;

const formatCurrency = (value?: number) =>
    (value ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN");
};

export default function CustomerReportPage() {
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });

    const [page, setPage] = useState(1);

    const [rows, setRows] = useState<CustomerRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // MR Territory state
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);

    useEffect(() => {
        loadMrTerritoryInfo();
    }, []);

    const loadMrTerritoryInfo = async () => {
        try {
            const res = await fetch("/api/mr-territory/my-territories");
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setMrTerritoryInfo({
                        isMrRestricted: data.isMrRestricted,
                        territories: data.territories || [],
                        allowedCompanyCodes: data.allowedCompanyCodes || [],
                    });
                }
            }
        } catch {
            // Silently ignore — territory info is cosmetic only; actual filtering is server-side
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFilters((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const { selectedFY } = useFinancialYear();
    const { selectedCompany } = useCompany();

    const fetchReport = useCallback(
        async (targetPage: number, activeFilters: typeof DEFAULT_FILTERS) => {
            setLoading(true);
            setError("");

            try {
                const params = new URLSearchParams({
                    report: "master",
                    page: String(targetPage),
                    limit: String(LIMIT),
                });

                if (selectedFY) {
                    if (selectedFY.isAll) {
                        params.set("fyId", "ALL");
                    } else if (selectedFY._id) {
                        params.set("fyId", selectedFY._id);
                        if (selectedFY.startDate && selectedFY.endDate) {
                            params.set("startDate", new Date(selectedFY.startDate).toISOString().slice(0, 10));
                            params.set("endDate", new Date(selectedFY.endDate).toISOString().slice(0, 10));
                        }
                    }
                }

                Object.entries(activeFilters).forEach(([key, value]) => {
                    if (value) params.set(key, value);
                });

                if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

                const res = await fetch(`/api/reports/customer?${params.toString()}`);
                const json: ApiResponse = await res.json();

                if (!res.ok || !json.success || !json.data) {
                    throw new Error(json.message || "Failed to load report");
                }

                setRows(json.data.rows || []);
                setTotal(json.data.total || 0);
                setTotalPages(json.data.totalPages || 1);
                setExpanded(new Set());
            } catch (err: any) {
                setError(err?.message || "Something went wrong");
                setRows([]);
                setTotal(0);
                setTotalPages(1);
            } finally {
                setLoading(false);
            }
        },
        [selectedFY, selectedCompany]
    );

    useEffect(() => {
        fetchReport(page, appliedFilters);
        const onFyChange = () => fetchReport(page, appliedFilters);
        window.addEventListener("financial-year-changed", onFyChange);
        return () => window.removeEventListener("financial-year-changed", onFyChange);
    }, [page, appliedFilters, fetchReport]);

    const searchReport = () => {
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const resetFilters = () => {
        setFilters({ ...DEFAULT_FILTERS });
        setAppliedFilters({ ...DEFAULT_FILTERS });
        setPage(1);
    };

    const toggleExpand = (ordno: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(ordno)) {
                next.delete(ordno);
            } else {
                next.add(ordno);
            }
            return next;
        });
    };

    return (
        <div className="container-fluid py-3">
            {/* ==================== MR TERRITORY BANNER ==================== */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm mb-3">
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

            <div className="card shadow-sm">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">Customer Report</h4>
                    <span className="badge bg-light text-dark">
                        {total} customer{total === 1 ? "" : "s"}
                    </span>
                </div>

                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">Search</label>
                            <input
                                type="text"
                                className="form-control"
                                name="search"
                                value={filters.search}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                placeholder="Customer Name / Code"
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Area</label>
                            <input
                                type="text"
                                className="form-control"
                                name="area"
                                value={filters.area}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Route</label>
                            <input
                                type="text"
                                className="form-control"
                                name="route"
                                value={filters.route}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">DSM</label>
                            <input
                                type="text"
                                className="form-control"
                                name="dsm"
                                value={filters.dsm}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                name="status"
                                value={filters.status}
                                onChange={handleChange}
                            >
                                <option value="">All</option>
                                <option value="Y">Active</option>
                                <option value="N">Inactive</option>
                            </select>
                        </div>

                        <div className="col-md-3 d-flex align-items-end gap-2">
                            <button
                                className="btn btn-primary"
                                onClick={searchReport}
                                disabled={loading}
                            >
                                {loading ? "Loading..." : "Search"}
                            </button>

                            <button
                                className="btn btn-secondary"
                                onClick={resetFilters}
                                disabled={loading}
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <hr />

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    <div className="table-responsive">
                        <table className="table table-bordered table-hover align-middle">
                            <thead className="table-dark">
                                <tr>
                                    <th style={{ width: 40 }}></th>
                                    <th style={{ width: 40 }}>#</th>
                                    <th>Customer Code</th>
                                    <th>Customer Name</th>
                                    <th>City</th>
                                    <th>Area</th>
                                    <th>Route</th>
                                    <th>DSM</th>
                                    <th>Status</th>
                                    <th className="text-end">Master Balance</th>
                                    <th className="text-end">Outstanding (Pend)</th>
                                    <th className="text-end">Ledger Balance</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={12} className="text-center py-4">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className="text-center py-4">
                                            No Data Found
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => {
                                        const isOpen = expanded.has(row.ORDNO);

                                        return (
                                            <Fragment key={row.ORDNO || idx}>
                                                <tr>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={() => toggleExpand(row.ORDNO)}
                                                            title="Show full details"
                                                        >
                                                            {isOpen ? "-" : "+"}
                                                        </button>
                                                    </td>
                                                    <td>{(page - 1) * LIMIT + idx + 1}</td>
                                                    <td>{row.ORDNO}</td>
                                                    <td>{row.PARNAM?.trim()}</td>
                                                    <td>{row.CITY || "-"}</td>
                                                    <td>{row.AREA || "-"}</td>
                                                    <td>{row.ROUT || "-"}</td>
                                                    <td>{row.DSM || "-"}</td>
                                                    <td>
                                                        <span
                                                            className={`badge ${row.STATUS === "Y"
                                                                ? "bg-success"
                                                                : "bg-secondary"
                                                                }`}
                                                        >
                                                            {row.STATUS === "Y" ? "Active" : "Inactive"}
                                                        </span>
                                                    </td>
                                                    <td className="text-end">
                                                        {formatCurrency(row.BALANCE)}
                                                    </td>
                                                    <td className="text-end">
                                                        <span
                                                            className={
                                                                (row.outstandingAmount ?? 0) > 0
                                                                    ? "text-danger fw-semibold"
                                                                    : ""
                                                            }
                                                        >
                                                            {formatCurrency(row.outstandingAmount)}
                                                        </span>
                                                    </td>
                                                    <td className="text-end">
                                                        {formatCurrency(row.ledgerBalance)}
                                                    </td>
                                                </tr>

                                                {isOpen && (
                                                    <tr key={`${row.ORDNO}-details`}>
                                                        <td></td>
                                                        <td colSpan={11} className="bg-light">
                                                            <div className="row g-3 py-2">
                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Order (Master)
                                                                    </h6>
                                                                    <div>Code: {row.CODEP || "-"}</div>
                                                                    <div>SCODE: {row.SCODE || "-"}</div>
                                                                    <div>GST No: {row.GSTNO || "-"}</div>
                                                                    <div>DL No: {row.DLNO || "-"}</div>
                                                                    <div>
                                                                        Phone: {row.PHONE1 || "-"}
                                                                        {row.PHONE2 ? `, ${row.PHONE2}` : ""}
                                                                    </div>
                                                                    <div>Due Days: {row.DUEDAYS ?? 0}</div>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Pend (Outstanding)
                                                                    </h6>
                                                                    <div>
                                                                        Outstanding:{" "}
                                                                        {formatCurrency(row.outstandingAmount)}
                                                                    </div>
                                                                    <div>
                                                                        Pending Vouchers:{" "}
                                                                        {row.pendingVouchers ?? 0}
                                                                    </div>
                                                                    <div>
                                                                        Last Due Date:{" "}
                                                                        {formatDate(row.lastDueDate)}
                                                                    </div>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        GlLedger (Transactions)
                                                                    </h6>
                                                                    <div>
                                                                        Total Debit:{" "}
                                                                        {formatCurrency(row.totalDebit)}
                                                                    </div>
                                                                    <div>
                                                                        Total Credit:{" "}
                                                                        {formatCurrency(row.totalCredit)}
                                                                    </div>
                                                                    <div>
                                                                        Ledger Balance:{" "}
                                                                        {formatCurrency(row.ledgerBalance)}
                                                                    </div>
                                                                    <div>
                                                                        Last Transaction:{" "}
                                                                        {formatDate(row.lastTransactionDate)}
                                                                    </div>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        MaOrder (Allocation)
                                                                    </h6>
                                                                    <div>
                                                                        MaOrder Balance:{" "}
                                                                        {formatCurrency(row.maOrderBalance)}
                                                                    </div>
                                                                    <div>
                                                                        Records: {row.maOrderCount ?? 0}
                                                                    </div>
                                                                    <div>
                                                                        Form: {row.maOrderForm || "-"}
                                                                    </div>
                                                                    <div>
                                                                        Last Date:{" "}
                                                                        {formatDate(row.lastMaOrderDate)}
                                                                    </div>
                                                                    {(row.maOrderCount ?? 0) === 0 && (
                                                                        <small className="text-muted">
                                                                            No matching MaOrder record
                                                                            for this customer code.
                                                                        </small>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <span className="text-muted">
                                Page {page} of {totalPages}
                            </span>

                            <div className="btn-group">
                                <button
                                    className="btn btn-outline-primary"
                                    disabled={page <= 1 || loading}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Previous
                                </button>
                                <button
                                    className="btn btn-outline-primary"
                                    disabled={page >= totalPages || loading}
                                    onClick={() =>
                                        setPage((p) => Math.min(totalPages, p + 1))
                                    }
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}