"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { FaBuilding, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";
import SearchableSelect, { OptionItem } from "@/components/SearchableSelect";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";

interface DisRecord {
    VOUCHER?: number;
    VCN?: string;
    DATE?: string;
    CODEP?: string;
    DSM?: string;
    AREA?: string;
    ROUT?: string;
    QTY?: number;
    ISSUEQTY?: number;
    RATE?: number;
    AMMMOUNT?: number;
    FREE?: number;
    FLAG?: string;
}

interface MdisRecord {
    VOUCHER?: number;
    VCN?: string;
    DATE?: string;
    CODEP?: string;
    FINAL?: number;
    DUEDAYS?: number;
    TRANSPORT?: string;
    LRNO?: string;
    TYPE?: string;
}

interface LedgerRecord {
    VOUCHER?: number;
    DATE?: string;
    CODE1?: string;
    DEBIT?: number;
    CREDIT?: number;
    TYPE?: string;
    REMARK1?: string;
}

interface SubDisRecord {
    VOUCHER?: number;
    DATE?: string;
    CODEP?: string;
    BOOK?: string;
    TYPE?: string;
    VCN?: string;
}

interface RateRecord {
    PCODE?: string;
    GCODE?: string;
    DISC1?: number;
    DISC2?: number;
    RATE?: number;
    DATE?: string;
}

interface SaleTypeRecord {
    GCODE?: string;
    TAX?: number;
    CGST?: number;
    IGST?: number;
    FORM?: string;
}

interface BatchRow {
    BATCHNO?: string;
    CODE?: number;
    NAME?: string;
    PRODUCT?: string;
    BILLNAME?: string;
    PACKING?: string;
    UNIT?: string;
    UNIT2?: string;
    SUPCODE?: string;
    SUPDAT?: string;
    SUPINVO?: string;
    DATE?: string;
    MFD?: string;
    EXP?: string;
    MRP?: number;
    PRATE?: number;
    LPRATE?: number;
    OPENING?: number;
    BALANCE?: number;
    QTY?: number;
    TQTY?: number;
    CGST?: number;
    IGST?: number;
    BSALTAX?: number;
    SELECT?: string;
    HOLD?: string | null;

    productInfo?: {
        STATUS?: string;
        GCODE?: string;
        MINIMUM?: number;
        MAXIMUM?: number;
        HALFSCHE?: string;
        QTRSCHE?: string;
        TAXC?: string;
        TAXL?: string;
        masterBalance?: number;
    };

    totalSoldQty?: number;
    totalSoldAmount?: number;
    salesVoucherCount?: number;
    lastSaleDate?: string | null;

    totalInvoiceFinal?: number;
    invoiceCount?: number;

    totalDebit?: number;
    totalCredit?: number;
    ledgerBalance?: number;

    subDisCount?: number;

    currentDisc1?: number;
    currentDisc2?: number;

    disRecords?: DisRecord[];
    mdisRecords?: MdisRecord[];
    ledgerRecords?: LedgerRecord[];
    subDisRecords?: SubDisRecord[];
    rateRecords?: RateRecord[];
    saleTypeRecords?: SaleTypeRecord[];
}

interface MasterReportData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    rows: BatchRow[];
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
    batchNo: "",
    productCode: "",
    productName: "",
    supplier: "",
    party: "",
    dsm: "",
    area: "",
    route: "",
    status: "",
    fromDate: "",
    toDate: "",
};

const LIMIT = 500;

const formatNumber = (value?: number) =>
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

const rowKey = (r: BatchRow) => `${r.CODE ?? ""}-${r.BATCHNO ?? ""}`;

export default function BatchReportPage() {
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });

    const [page, setPage] = useState(1);

    const [rows, setRows] = useState<BatchRow[]>([]);
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
                            params.set("fromDate", new Date(selectedFY.startDate).toISOString().slice(0, 10));
                            params.set("toDate", new Date(selectedFY.endDate).toISOString().slice(0, 10));
                        }
                    }
                }

                Object.entries(activeFilters).forEach(([key, value]) => {
                    if (value) params.set(key, value);
                });

                if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

                const res = await fetch(`/api/reports/batch?${params.toString()}`);
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

    const toggleExpand = (key: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
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
                            Aap sirf apni assigned territory ke batches dekh sakte hain.
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
                    <h4 className="mb-0">
                        Batch Report
                    </h4>
                    <span className="badge bg-light text-dark">
                        {total} batch{total === 1 ? "" : "es"}
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
                                placeholder="Batch No / Product / Supplier"
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
                            <label className="form-label">Product Code</label>
                            <input
                                type="text"
                                className="form-control"
                                name="productCode"
                                value={filters.productCode}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Product Name</label>
                            <input
                                type="text"
                                className="form-control"
                                name="productName"
                                value={filters.productName}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Supplier Code</label>
                            <input
                                type="text"
                                className="form-control"
                                name="supplier"
                                value={filters.supplier}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Party Code</label>
                            <input
                                type="text"
                                className="form-control"
                                name="party"
                                value={filters.party}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                placeholder="From sales (DIS.CODEP)"
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
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                name="status"
                                value={filters.status}
                                onChange={handleChange}
                            >
                                <option value="">All</option>
                                <option value="Y">Selected (Y)</option>
                                <option value="N">Not Selected (N)</option>
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">From Date (Batch)</label>
                            <input
                                type="date"
                                className="form-control"
                                name="fromDate"
                                value={filters.fromDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">To Date (Batch)</label>
                            <input
                                type="date"
                                className="form-control"
                                name="toDate"
                                value={filters.toDate}
                                onChange={handleChange}
                            />
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
                                    <th>Batch No</th>
                                    <th>Product</th>
                                    <th>Supplier</th>
                                    <th className="text-end">MRP</th>
                                    <th className="text-end">Stock Balance</th>
                                    <th className="text-end">Sold Qty</th>
                                    <th className="text-end">Sold Amount</th>
                                    <th className="text-end">Ledger Balance</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-4">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-4">
                                            No Data Found
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => {
                                        const key = rowKey(row);
                                        const isOpen = expanded.has(key);

                                        return (
                                            <Fragment key={key || idx}>
                                                <tr>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={() => toggleExpand(key)}
                                                            title="Show full details"
                                                        >
                                                            {isOpen ? "-" : "+"}
                                                        </button>
                                                    </td>
                                                    <td>{(page - 1) * LIMIT + idx + 1}</td>
                                                    <td>{row.BATCHNO?.trim()}</td>
                                                    <td>
                                                        <div>{(row.PRODUCT || row.BILLNAME)?.trim()}</div>
                                                        <small className="text-muted">
                                                            {row.NAME?.trim()} · {row.PACKING?.trim() || "-"}
                                                        </small>
                                                    </td>
                                                    <td>{row.SUPCODE?.trim() || "-"}</td>
                                                    <td className="text-end">{formatNumber(row.MRP)}</td>
                                                    <td className="text-end">
                                                        <span
                                                            className={
                                                                (row.BALANCE ?? 0) < 0
                                                                    ? "text-danger fw-semibold"
                                                                    : ""
                                                            }
                                                        >
                                                            {formatNumber(row.BALANCE)}
                                                        </span>
                                                    </td>
                                                    <td className="text-end">
                                                        {formatNumber(row.totalSoldQty)}
                                                    </td>
                                                    <td className="text-end">
                                                        {formatNumber(row.totalSoldAmount)}
                                                    </td>
                                                    <td className="text-end">
                                                        {formatNumber(row.ledgerBalance)}
                                                    </td>
                                                </tr>

                                                {isOpen && (
                                                    <tr key={`${key}-details`}>
                                                        <td></td>
                                                        <td colSpan={9} className="bg-light">
                                                            <div className="row g-3 py-2">
                                                                <div className="col-md-4">
                                                                    <h6 className="text-primary">
                                                                        Batch / Stock (PROBAT)
                                                                    </h6>
                                                                    <div>Code: {row.CODE}</div>
                                                                    <div>Item Code: {row.NAME}</div>
                                                                    <div>Opening: {formatNumber(row.OPENING)}</div>
                                                                    <div>Qty: {formatNumber(row.QTY)}</div>
                                                                    <div>Pur. Rate: {formatNumber(row.PRATE)}</div>
                                                                    <div>Last Pur. Rate: {formatNumber(row.LPRATE)}</div>
                                                                    <div>Supplier Invoice: {row.SUPINVO || "-"}</div>
                                                                    <div>Supply Date: {formatDate(row.SUPDAT)}</div>
                                                                    <div>MFD / EXP: {formatDate(row.MFD)} / {formatDate(row.EXP)}</div>
                                                                    <div>CGST / IGST: {row.CGST ?? 0} / {row.IGST ?? 0}</div>
                                                                    <div>Select / Hold: {row.SELECT || "-"} / {row.HOLD || "-"}</div>
                                                                </div>

                                                                <div className="col-md-4">
                                                                    <h6 className="text-primary">
                                                                        Product Master (PRO)
                                                                    </h6>
                                                                    <div>Status: {row.productInfo?.STATUS || "-"}</div>
                                                                    <div>Group Code: {row.productInfo?.GCODE || "-"}</div>
                                                                    <div>
                                                                        Min / Max:{" "}
                                                                        {row.productInfo?.MINIMUM ?? 0} /{" "}
                                                                        {row.productInfo?.MAXIMUM ?? 0}
                                                                    </div>
                                                                    <div>
                                                                        Half / Qtr Scheme:{" "}
                                                                        {row.productInfo?.HALFSCHE || "-"} /{" "}
                                                                        {row.productInfo?.QTRSCHE || "-"}
                                                                    </div>
                                                                    <div>
                                                                        Tax (C/L): {row.productInfo?.TAXC || "-"} /{" "}
                                                                        {row.productInfo?.TAXL || "-"}
                                                                    </div>
                                                                    <div>
                                                                        Master Stock Balance:{" "}
                                                                        {formatNumber(row.productInfo?.masterBalance)}
                                                                    </div>

                                                                    <h6 className="text-primary mt-3">
                                                                        Rate / Discount (RATE)
                                                                    </h6>
                                                                    <div>Disc 1: {row.currentDisc1 ?? 0}%</div>
                                                                    <div>Disc 2: {row.currentDisc2 ?? 0}%</div>
                                                                    {(row.rateRecords?.length ?? 0) === 0 && (
                                                                        <small className="text-muted">
                                                                            No RATE record for this product code.
                                                                        </small>
                                                                    )}

                                                                    <h6 className="text-primary mt-3">
                                                                        Sale Type (SALETYPE)
                                                                    </h6>
                                                                    {(row.saleTypeRecords?.length ?? 0) === 0 ? (
                                                                        <small className="text-muted">
                                                                            No SALETYPE record for this product code.
                                                                        </small>
                                                                    ) : (
                                                                        row.saleTypeRecords!.map((st, i) => (
                                                                            <div key={i}>
                                                                                {st.GCODE || "-"} · Tax {st.TAX ?? 0} · CGST{" "}
                                                                                {st.CGST ?? 0} · IGST {st.IGST ?? 0}
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>

                                                                <div className="col-md-4">
                                                                    <h6 className="text-primary">
                                                                        Sales (DIS) — {row.salesVoucherCount ?? 0} voucher(s)
                                                                    </h6>
                                                                    {(row.disRecords?.length ?? 0) === 0 ? (
                                                                        <small className="text-muted">
                                                                            No sales for this batch.
                                                                        </small>
                                                                    ) : (
                                                                        <div style={{ maxHeight: 160, overflowY: "auto" }}>
                                                                            {row.disRecords!.map((d, i) => (
                                                                                <div key={i} className="border-bottom py-1">
                                                                                    #{d.VOUCHER} · {formatDate(d.DATE)} ·{" "}
                                                                                    {d.CODEP?.trim() || "-"} · Qty {formatNumber(d.ISSUEQTY)} ·{" "}
                                                                                    {formatNumber(d.AMMMOUNT)}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className="mt-1">
                                                                        Last Sale: {formatDate(row.lastSaleDate)}
                                                                    </div>

                                                                    <h6 className="text-primary mt-3">
                                                                        Invoice Header (MDIS) — {row.invoiceCount ?? 0}
                                                                    </h6>
                                                                    <div>Total Final: {formatNumber(row.totalInvoiceFinal)}</div>

                                                                    <h6 className="text-primary mt-3">
                                                                        Ledger (GLEDGER)
                                                                    </h6>
                                                                    <div>Debit: {formatNumber(row.totalDebit)}</div>
                                                                    <div>Credit: {formatNumber(row.totalCredit)}</div>
                                                                    <div>Balance: {formatNumber(row.ledgerBalance)}</div>

                                                                    <h6 className="text-primary mt-3">
                                                                        Sub-Distribution (SUBDIS) — {row.subDisCount ?? 0}
                                                                    </h6>
                                                                    {(row.subDisRecords?.length ?? 0) === 0 && (
                                                                        <small className="text-muted">
                                                                            No sub-distribution entries.
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