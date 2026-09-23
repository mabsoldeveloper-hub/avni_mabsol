"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { FaBuilding, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";

interface BatchInfo {
    batchNo?: string;
    mfd?: string | null;
    exp?: string | null;
    batchQty?: number;
    batchMrp?: number;
    batchPurchaseRate?: number;
}

interface RateHistoryRow {
    date?: string | null;
    rate?: number;
    disc1?: number;
    disc2?: number;
    free?: number;
}

// Raw SALETYPE breakdown - field meanings (D/O/S/T, A/B/C/D suffixes) are not yet
// confirmed with the business, so these are surfaced as-is. See ProductReport.ts NOTE #7.
interface SaleTypeRow {
    itCode?: string | null;
    itGCode?: string | null;
    itName?: string | null;
    sCode?: string | null;
    sGCode?: string | null;
    sName?: string | null;
    tCode?: string | null;
    tGCode?: string | null;
    tName?: string | null;
    margCode?: string | null;
    opening?: number;
    balance?: number;
    qty?: number;
    tqty?: number;
    amount?: number;
    freeBal?: number;
    freeOpe?: number;
    disc1D?: number;
    disc1O?: number;
    disc1S?: number;
    disc1T?: number;
    disc2D?: number;
    disc2O?: number;
    disc2S?: number;
    disc2T?: number;
    cgst?: number;
    igst?: number;
    tax?: number;
    form?: string | null;
}

interface ProductRow {
    CODE: number;
    PRODUCT: string;
    BILLNAME?: string;
    category?: string;
    company?: string | null;
    UNIT?: string;
    PACKING?: string | null;
    gst?: number;
    MRP?: number;
    purchaseRate?: number;
    salesRate?: number;
    margin?: number;
    STATUS?: string;

    batches?: BatchInfo[];

    OPENING?: number;
    currentStock?: number;
    freeStock?: number;
    closingStock?: number;
    negativeStock?: boolean;

    latestDiscount?: number;
    latestScheme?: number;
    rateHistory?: RateHistoryRow[];

    saleQty?: number;
    saleAmount?: number;
    lastSaleDate?: string | null;
    lastInvoiceNo?: number;
    salesCount?: number;

    totalDebit?: number;
    totalCredit?: number;
    ledgerBalance?: number;
    lastLedgerDate?: string | null;

    dispatchQty?: number;
    lastDispatchDate?: string | null;
    lastDispatchVoucher?: number;
    dispatchCount?: number;

    saleTypeBreakdown?: SaleTypeRow[];
    saleTypeCount?: number;

    profit?: number;
    marginPercent?: number;
    nearExpiry?: boolean;
    movement?: "Fast Moving" | "Slow Moving" | "Dead Stock" | "Normal";
}


interface ProductReportData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    rows: ProductRow[];
}

interface ApiResponse {
    success: boolean;
    data?: ProductReportData;
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
    category: "",
    company: "",
    status: "",
    batchNo: "",
};

const LIMIT = 500;

const formatCurrency = (value?: number) =>
    (value ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const formatNumber = (value?: number) => (value ?? 0).toLocaleString("en-IN");

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN");
};

const movementBadgeClass = (movement?: string) => {
    switch (movement) {
        case "Fast Moving":
            return "bg-success";
        case "Slow Moving":
            return "bg-warning text-dark";
        case "Dead Stock":
            return "bg-danger";
        default:
            return "bg-secondary";
    }
};

export default function ProductReportPage() {
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });

    const [page, setPage] = useState(1);

    const [rows, setRows] = useState<ProductRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [expanded, setExpanded] = useState<Set<number>>(new Set());

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

    // Tracks the in-flight request so we can abort it if a newer one starts,
    // and so a slow/late response can never overwrite fresher data on screen.
    const abortControllerRef = useRef<AbortController | null>(null);

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
            // Cancel any request that's still in flight from a previous
            // page/filter change so its (possibly slow) response can't
            // arrive later and overwrite newer data.
            abortControllerRef.current?.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;

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

                const res = await fetch(`/api/reports/product?${params.toString()}`, {
                    signal: controller.signal,
                });
                const json: ApiResponse = await res.json();

                if (!res.ok || !json.success || !json.data) {
                    throw new Error(json.message || "Failed to load report");
                }

                setRows(json.data.rows || []);
                setTotal(json.data.total || 0);
                setTotalPages(json.data.totalPages || 1);
                setExpanded(new Set());
            } catch (err: any) {
                if (err?.name === "AbortError") return;

                setError(err?.message || "Something went wrong");
                setRows([]);
                setTotal(0);
                setTotalPages(1);
            } finally {
                if (abortControllerRef.current === controller) {
                    setLoading(false);
                }
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

    // Abort any pending request on unmount.
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    const searchReport = () => {
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const resetFilters = () => {
        setFilters({ ...DEFAULT_FILTERS });
        setAppliedFilters({ ...DEFAULT_FILTERS });
        setPage(1);
    };

    const toggleExpand = (code: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(code)) {
                next.delete(code);
            } else {
                next.add(code);
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

            <div className="card shadow-sm">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">Product Report</h4>
                    <span className="badge bg-light text-dark">
                        {total} product{total === 1 ? "" : "s"}
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
                                placeholder="Product Name / Bill Name / Code"
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Category</label>
                            <input
                                type="text"
                                className="form-control"
                                name="category"
                                value={filters.category}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Company</label>
                            <input
                                type="text"
                                className="form-control"
                                name="company"
                                value={filters.company}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Batch No</label>
                            <input
                                type="text"
                                className="form-control"
                                name="batchNo"
                                value={filters.batchNo}
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
                                    <th>Code</th>
                                    <th>Product Name</th>
                                    <th>Category / Company</th>
                                    <th>Unit / Packing</th>
                                    <th>Status</th>
                                    <th className="text-end">MRP</th>
                                    <th className="text-end">Current Stock</th>
                                    <th className="text-end">Sale Qty</th>
                                    <th>Movement</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className="text-center py-4">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="text-center py-4">
                                            No Data Found
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => {
                                        const isOpen = expanded.has(row.CODE);

                                        return (
                                            <Fragment key={row.CODE ?? idx}>
                                                <tr>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={() => toggleExpand(row.CODE)}
                                                            title="Show full details"
                                                        >
                                                            {isOpen ? "-" : "+"}
                                                        </button>
                                                    </td>
                                                    <td>{(page - 1) * LIMIT + idx + 1}</td>
                                                    <td>{row.CODE}</td>
                                                    <td>
                                                        {row.PRODUCT}
                                                        {row.nearExpiry && (
                                                            <span className="badge bg-danger ms-2">
                                                                Near Expiry
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div>{row.category || "-"}</div>
                                                        <small className="text-muted">
                                                            {row.company || "-"}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        {row.UNIT || "-"}
                                                        {row.PACKING ? ` / ${row.PACKING}` : ""}
                                                    </td>
                                                    <td>
                                                        {(() => {
                                                            const st = String(row.STATUS || "").trim().toUpperCase();
                                                            const isActive = !st || st === "Y" || st === "C" || st === "CONTINUE" || st === "ACTIVE";
                                                            return (
                                                                <span className={`badge ${isActive ? "bg-success" : "bg-secondary"}`}>
                                                                    {isActive ? "Active" : st ? `Inactive (${st})` : "Inactive"}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="text-end">{formatCurrency(row.MRP)}</td>
                                                    <td className="text-end">
                                                        <span
                                                            className={
                                                                row.negativeStock
                                                                    ? "text-danger fw-semibold"
                                                                    : ""
                                                            }
                                                        >
                                                            {formatNumber(row.currentStock)}
                                                        </span>
                                                    </td>
                                                    <td className="text-end">
                                                        {formatNumber(row.saleQty)}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`badge ${movementBadgeClass(
                                                                row.movement
                                                            )}`}
                                                        >
                                                            {row.movement || "-"}
                                                        </span>
                                                    </td>
                                                </tr>

                                                {isOpen && (
                                                    <tr key={`${row.CODE}-details`}>
                                                        <td></td>
                                                        <td colSpan={10} className="bg-light">
                                                            <div className="row g-3 py-2">
                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Product
                                                                    </h6>
                                                                    <div>Bill Name: {row.BILLNAME || "-"}</div>
                                                                    <div>GST: {row.gst ?? 0}%</div>
                                                                    <div>
                                                                        Purchase Rate:{" "}
                                                                        {formatCurrency(row.purchaseRate)}
                                                                    </div>
                                                                    <div>
                                                                        Sales Rate:{" "}
                                                                        {formatCurrency(row.salesRate)}
                                                                    </div>
                                                                    <div>
                                                                        Margin: {formatCurrency(row.margin)}
                                                                    </div>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">Stock</h6>
                                                                    <div>
                                                                        Opening Qty:{" "}
                                                                        {formatNumber(row.OPENING)}
                                                                    </div>
                                                                    <div>
                                                                        Current Stock:{" "}
                                                                        {formatNumber(row.currentStock)}
                                                                    </div>
                                                                    <div>
                                                                        Free Stock:{" "}
                                                                        {formatNumber(row.freeStock)}
                                                                    </div>
                                                                    <div>
                                                                        Closing Stock:{" "}
                                                                        {formatNumber(row.closingStock)}
                                                                    </div>
                                                                    <div>
                                                                        Negative Stock:{" "}
                                                                        {row.negativeStock ? "Yes" : "No"}
                                                                    </div>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Rate / Scheme
                                                                    </h6>
                                                                    <div>
                                                                        Latest Discount:{" "}
                                                                        {row.latestDiscount ?? 0}%
                                                                    </div>
                                                                    <div>
                                                                        Latest Scheme (Free):{" "}
                                                                        {row.latestScheme ?? 0}
                                                                    </div>
                                                                    <div className="mt-2">
                                                                        <small className="text-muted">
                                                                            Rate History (
                                                                            {row.rateHistory?.length || 0}{" "}
                                                                            entries)
                                                                        </small>
                                                                        {row.rateHistory
                                                                            ?.slice(0, 5)
                                                                            .map((r, i) => (
                                                                                <div
                                                                                    key={i}
                                                                                    className="small"
                                                                                >
                                                                                    {formatDate(r.date)} - Rate:{" "}
                                                                                    {formatCurrency(r.rate)},
                                                                                    Disc1: {r.disc1 ?? 0}%
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Sales / Analysis
                                                                    </h6>
                                                                    <div>
                                                                        Sale Qty: {formatNumber(row.saleQty)}
                                                                    </div>
                                                                    <div>
                                                                        Sale Amount:{" "}
                                                                        {formatCurrency(row.saleAmount)}
                                                                    </div>
                                                                    <div>
                                                                        Last Sale:{" "}
                                                                        {formatDate(row.lastSaleDate)}
                                                                    </div>
                                                                    <div>
                                                                        Last Invoice No:{" "}
                                                                        {row.lastInvoiceNo || "-"}
                                                                    </div>
                                                                    <div>
                                                                        Profit: {formatCurrency(row.profit)}
                                                                    </div>
                                                                    <div>
                                                                        Margin %:{" "}
                                                                        {(row.marginPercent ?? 0).toFixed(2)}%
                                                                    </div>
                                                                </div>

                                                                <div className="col-12">
                                                                    <h6 className="text-primary">
                                                                        Batches ({row.batches?.length || 0})
                                                                    </h6>
                                                                    {(row.batches?.length ?? 0) === 0 ? (
                                                                        <small className="text-muted">
                                                                            No batch records for this product
                                                                            code.
                                                                        </small>
                                                                    ) : (
                                                                        <div className="table-responsive">
                                                                            <table className="table table-sm table-bordered mb-0">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th>Batch No</th>
                                                                                        <th>MFD</th>
                                                                                        <th>EXP</th>
                                                                                        <th className="text-end">
                                                                                            Batch Qty
                                                                                        </th>
                                                                                        <th className="text-end">
                                                                                            Batch MRP
                                                                                        </th>
                                                                                        <th className="text-end">
                                                                                            Batch Purchase Rate
                                                                                        </th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {row.batches?.map(
                                                                                        (b, i) => (
                                                                                            <tr key={i}>
                                                                                                <td>
                                                                                                    {b.batchNo || "-"}
                                                                                                </td>
                                                                                                <td>
                                                                                                    {formatDate(
                                                                                                        b.mfd
                                                                                                    )}
                                                                                                </td>
                                                                                                <td>
                                                                                                    {formatDate(
                                                                                                        b.exp
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="text-end">
                                                                                                    {formatNumber(
                                                                                                        b.batchQty
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="text-end">
                                                                                                    {formatCurrency(
                                                                                                        b.batchMrp
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="text-end">
                                                                                                    {formatCurrency(
                                                                                                        b.batchPurchaseRate
                                                                                                    )}
                                                                                                </td>
                                                                                            </tr>
                                                                                        )
                                                                                    )}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Ledger{" "}
                                                                        <small className="text-muted">
                                                                            (group-level)
                                                                        </small>
                                                                    </h6>
                                                                    <div>
                                                                        Debit:{" "}
                                                                        {formatCurrency(
                                                                            row.totalDebit
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        Credit:{" "}
                                                                        {formatCurrency(
                                                                            row.totalCredit
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        Balance:{" "}
                                                                        {formatCurrency(
                                                                            row.ledgerBalance
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        Last Entry:{" "}
                                                                        {formatDate(
                                                                            row.lastLedgerDate
                                                                        )}
                                                                    </div>
                                                                    <small className="text-muted">
                                                                        Joined on product group
                                                                        code (GCODE) - not exact
                                                                        per-product, see model
                                                                        notes.
                                                                    </small>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Dispatch{" "}
                                                                        <small className="text-muted">
                                                                            (via voucher)
                                                                        </small>
                                                                    </h6>
                                                                    <div>
                                                                        Dispatch Qty:{" "}
                                                                        {formatNumber(
                                                                            row.dispatchQty
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        Dispatch Date:{" "}
                                                                        {formatDate(
                                                                            row.lastDispatchDate
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        Voucher:{" "}
                                                                        {row.lastDispatchVoucher ||
                                                                            "-"}
                                                                    </div>
                                                                    <div>
                                                                        Dispatch Entries:{" "}
                                                                        {row.dispatchCount ?? 0}
                                                                    </div>
                                                                    <small className="text-muted">
                                                                        Qty sourced from
                                                                        DIS.ISSUEQTY - SUBDIS
                                                                        itself has no qty
                                                                        field, see model notes.
                                                                    </small>
                                                                </div>

                                                                <div className="col-12">
                                                                    <h6 className="text-primary">
                                                                        Sale Type Breakdown (
                                                                        {row.saleTypeCount ?? 0}
                                                                        )
                                                                    </h6>
                                                                    {(row.saleTypeBreakdown
                                                                        ?.length ?? 0) === 0 ? (
                                                                        <small className="text-muted">
                                                                            No SALETYPE records
                                                                            for this product
                                                                            code.
                                                                        </small>
                                                                    ) : (
                                                                        <>
                                                                            <small className="text-muted d-block mb-1">
                                                                                Raw fields from
                                                                                SALETYPE - the
                                                                                D/O/S/T split
                                                                                hasn&apos;t been
                                                                                confirmed yet, see
                                                                                model notes (NOTE
                                                                                #7).
                                                                            </small>
                                                                            <div className="table-responsive">
                                                                                <table className="table table-sm table-bordered mb-0">
                                                                                    <thead>
                                                                                        <tr>
                                                                                            <th>
                                                                                                Item
                                                                                                Code /
                                                                                                Name
                                                                                            </th>
                                                                                            <th>
                                                                                                S
                                                                                                Code /
                                                                                                Name
                                                                                            </th>
                                                                                            <th>
                                                                                                T
                                                                                                Code /
                                                                                                Name
                                                                                            </th>
                                                                                            <th className="text-end">
                                                                                                Opening
                                                                                            </th>
                                                                                            <th className="text-end">
                                                                                                Balance
                                                                                            </th>
                                                                                            <th className="text-end">
                                                                                                Qty
                                                                                            </th>
                                                                                            <th className="text-end">
                                                                                                Amount
                                                                                            </th>
                                                                                            <th className="text-end">
                                                                                                Disc1
                                                                                                (D/O/S/T)
                                                                                            </th>
                                                                                            <th className="text-end">
                                                                                                Disc2
                                                                                                (D/O/S/T)
                                                                                            </th>
                                                                                            <th className="text-end">
                                                                                                CGST /
                                                                                                IGST /
                                                                                                Tax
                                                                                            </th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {row.saleTypeBreakdown?.map(
                                                                                            (
                                                                                                st,
                                                                                                i
                                                                                            ) => (
                                                                                                <tr
                                                                                                    key={
                                                                                                        i
                                                                                                    }
                                                                                                >
                                                                                                    <td>
                                                                                                        {st.itCode ||
                                                                                                            "-"}{" "}
                                                                                                        /{" "}
                                                                                                        {st.itName ||
                                                                                                            "-"}
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        {st.sCode ||
                                                                                                            "-"}{" "}
                                                                                                        /{" "}
                                                                                                        {st.sName ||
                                                                                                            "-"}
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        {st.tCode ||
                                                                                                            "-"}{" "}
                                                                                                        /{" "}
                                                                                                        {st.tName ||
                                                                                                            "-"}
                                                                                                    </td>
                                                                                                    <td className="text-end">
                                                                                                        {formatNumber(
                                                                                                            st.opening
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td className="text-end">
                                                                                                        {formatNumber(
                                                                                                            st.balance
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td className="text-end">
                                                                                                        {formatNumber(
                                                                                                            st.qty
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td className="text-end">
                                                                                                        {formatCurrency(
                                                                                                            st.amount
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td className="text-end">
                                                                                                        {st.disc1D ??
                                                                                                            0}
                                                                                                        /
                                                                                                        {st.disc1O ??
                                                                                                            0}
                                                                                                        /
                                                                                                        {st.disc1S ??
                                                                                                            0}
                                                                                                        /
                                                                                                        {st.disc1T ??
                                                                                                            0}
                                                                                                    </td>
                                                                                                    <td className="text-end">
                                                                                                        {st.disc2D ??
                                                                                                            0}
                                                                                                        /
                                                                                                        {st.disc2O ??
                                                                                                            0}
                                                                                                        /
                                                                                                        {st.disc2S ??
                                                                                                            0}
                                                                                                        /
                                                                                                        {st.disc2T ??
                                                                                                            0}
                                                                                                    </td>
                                                                                                    <td className="text-end">
                                                                                                        {st.cgst ??
                                                                                                            0}
                                                                                                        /
                                                                                                        {st.igst ??
                                                                                                            0}
                                                                                                        /
                                                                                                        {st.tax ??
                                                                                                            0}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            )
                                                                                        )}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </>
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