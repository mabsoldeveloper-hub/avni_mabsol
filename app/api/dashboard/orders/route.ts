import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";

import Order from "@/models/Order";
import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import GlLedger from "@/models/GlLedger";
import Pend from "@/models/Pend";
import SubDis from "@/models/SubDis";

import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

/**
 * NOTE ON DATA MODEL (verified against real exported DB records)
 * -----------------------------------------------------------------
 * - All DATE fields (MDIS.DATE, DIS.DATE, GLEDGER.DATE, PEND.DDATE, SUBDIS.DATE)
 *   are stored as plain "YYYY-MM-DD" STRINGS, not Mongo Date objects.
 *   String range queries ($gte/$lte) work fine because the format is ISO.
 *
 * - FILTER FIELD AVAILABILITY (checked against the real exported data):
 *     AREA  -> NULL in every row of MDIS, DIS, SUBDIS, ORDER, GLEDGER, PEND.
 *              Not populated in the source VFP tables at all right now.
 *     ROUT  -> Same as AREA — NULL everywhere in this export.
 *     DSM   -> NULL in MDIS/GLEDGER/PEND. Has real values in DIS
 *              (e.g. "AHYI") and SUBDIS (e.g. "#COMD#","BILREC"). So DSM
 *              filtering only makes sense against Order Items / Dispatch
 *              Details, not Order Summary / Latest Orders.
 *              NOTE: ORDER.DSM also has values but they look like PIN
 *              codes (e.g. "134113"), not real DSM/salesman codes — do
 *              NOT source the DSM dropdown from ORDER.
 *   Area/Route dropdowns will legitimately come back empty until the
 *   client starts populating those fields upstream — this isn't a bug.
 *   CITY on ORDER does have real values (e.g. "CHANDIGARH") if an area-like
 *   filter is wanted sooner — used below as the stand-in.
 *
 * - MDIS.TYPE ("V"/"S"/"P"/"B") — VERIFIED FINDING:
 *   Every row with TYPE === "V" has DATE = null AND VCN = null (334/334 in
 *   the sample export, ~45% of all MDIS rows). These are unposted/void
 *   vouchers with no invoice number and no date — they are NOT real orders.
 *   They were previously being counted in totalOrders/orderSummary/etc,
 *   inflating those numbers, while silently falling out of any date-range
 *   KPI (today/month/year) because their DATE is null. Fixed below by:
 *     1) Excluding TYPE:"V" from every real "order" query via REAL_ORDER_FILTER.
 *     2) Using TYPE:"V" to finally populate the cancelledOrders KPI, which
 *        was previously a hardcoded TODO placeholder.
 */

// Rows with TYPE "V" are unposted/void vouchers (no DATE, no VCN) — exclude
// them from anything that represents a "real" order.
const REAL_ORDER_FILTER = { TYPE: { $ne: "V" } };
const VOID_ORDER_FILTER = { TYPE: "V" };

function monthBounds(d: Date) {
    const y = d.getFullYear();
    const m = d.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
}

function yearBounds(d: Date) {
    const y = d.getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
}

type FilterParams = {
    customer?: string;
    invoice?: string;
    dateFrom?: string;
    dateTo?: string;
    area?: string;
    route?: string;
    dsm?: string;
};

type FieldMap = {
    customer?: string;
    invoice?: string;
    date?: string;
    area?: string;
    route?: string;
    dsm?: string;
};

/** Builds a Mongo $match object from query params, only wiring fields that
 *  actually exist (and are meaningfully populated) on the target table. */
function buildFilter(params: FilterParams, fields: FieldMap) {
    const match: Record<string, any> = { _vfpDeleted: { $ne: true } };

    if (params.customer && fields.customer) {
        match[fields.customer] = { $regex: params.customer, $options: "i" };
    }

    if (params.invoice && fields.invoice) {
        match[fields.invoice] = { $regex: params.invoice, $options: "i" };
    }

    if (fields.date && (params.dateFrom || params.dateTo)) {
        match[fields.date] = {};
        if (params.dateFrom) match[fields.date].$gte = params.dateFrom;
        if (params.dateTo) match[fields.date].$lte = params.dateTo;
    }

    if (params.area && fields.area) {
        match[fields.area] = params.area;
    }

    if (params.route && fields.route) {
        match[fields.route] = params.route;
    }

    if (params.dsm && fields.dsm) {
        match[fields.dsm] = params.dsm;
    }

    return match;
}

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

export async function GET(request: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const fyRange = await getFYDateRange(searchParams);
        const { startDate, endDate } = fyRange;
        const fyDateMatch = buildFYDateQuery("DATE", startDate, endDate);
        const fyPendMatch = buildFYDateQuery("DDATE", startDate, endDate);
        const restriction = await getMrTerritoryRestriction();

        let mrMdisMatch: any = {};
        let mrDisMatch: any = {};
        let mrSubdisMatch: any = {};

        if (restriction.isMrRestricted) {
          const orConditions: any[] = [];
          if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
            orConditions.push({ CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } });
          }
          if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
            orConditions.push({ COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } });
          }

          if (orConditions.length > 0) {
            mrMdisMatch = { $or: orConditions };
            mrDisMatch = { $or: orConditions };
            mrSubdisMatch = { $or: orConditions };
          } else {
            mrMdisMatch = { CODEP: "NONE_MATCH" };
            mrDisMatch = { CODEP: "NONE_MATCH" };
            mrSubdisMatch = { CODEP: "NONE_MATCH" };
          }
        }

        const mrGledgerMatch: any = restriction.isMrRestricted
            ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { CODE: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { CODE: "NONE_MATCH" }
            : {};

        const mrPendMatch: any = restriction.isMrRestricted
            ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { ORD: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { ORD: "NONE_MATCH" }
            : {};

        const filters: FilterParams = {
            customer: searchParams.get("customer") || undefined,
            invoice: searchParams.get("invoice") || undefined,
            dateFrom: searchParams.get("dateFrom") || undefined,
            dateTo: searchParams.get("dateTo") || undefined,
            area: searchParams.get("area") || undefined,
            route: searchParams.get("route") || undefined,
            dsm: searchParams.get("dsm") || undefined,
        };

        // Per-table filter objects (field names differ table to table)
        let mdisFilter = combineFilters(
            buildFilter(filters, {
                customer: "CODEP",
                invoice: "VCN",
                date: "DATE",
                area: "AREA",
                route: "ROUT",
                dsm: "DSM", // NULL in every MDIS row today — see note above
            }),
            mrMdisMatch,
            companyVfpMatch
        );

        // "Real order" version of mdisFilter — excludes TYPE:"V" void rows.
        let mdisRealOrderFilter = combineFilters(mdisFilter, REAL_ORDER_FILTER, companyVfpMatch);

        let disFilter = combineFilters(
            buildFilter(filters, {
                customer: "CODEP",
                invoice: "VCN",
                date: "DATE",
                area: "AREA",
                route: "ROUT",
                dsm: "DSM", // has real values on DIS
            }),
            mrDisMatch,
            companyVfpMatch
        );

        let subdisFilter = combineFilters(
            buildFilter(filters, {
                customer: "CODEP",
                invoice: "VCN",
                date: "DATE",
                area: "AREA",
                route: "ROUT",
                dsm: "DSM", // has real values on SUBDIS
            }),
            mrSubdisMatch,
            companyVfpMatch
        );

        let gledgerFilter = combineFilters(
            buildFilter(filters, {
                customer: "CODE", // GLEDGER uses CODE, not CODEP
                date: "DATE",
                // no invoice/area/route/dsm fields on GLEDGER
            }),
            mrGledgerMatch,
            companyVfpMatch
        );

        let pendFilter = combineFilters(
            buildFilter(filters, {
                customer: "ORD", // PEND uses ORD, not CODEP
                invoice: "VCN",
                date: "DDATE",
                area: "AREA",
                route: "ROUT",
                dsm: "DSM",
            }),
            mrPendMatch,
            companyVfpMatch
        );

        if (!filters.dateFrom && !filters.dateTo) {
            mdisFilter = combineFilters(mdisFilter, fyDateMatch);
            mdisRealOrderFilter = combineFilters(mdisRealOrderFilter, fyDateMatch);
            disFilter = combineFilters(disFilter, fyDateMatch);
            subdisFilter = combineFilters(subdisFilter, fyDateMatch);
            gledgerFilter = combineFilters(gledgerFilter, fyDateMatch);
            pendFilter = combineFilters(pendFilter, fyPendMatch);
        }

        const orderFilter = combineFilters(
            buildFilter(filters, {
                customer: "ORDNO", // ORDER uses ORDNO
                invoice: "VCN",
                date: "DATE",
                area: "AREA",
                route: "ROUT",
                dsm: "DSM",
            }),
            restriction.isMrRestricted
                ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                    ? { ORDNO: { $in: restriction.allowedOrdnos } }
                    : { ORDNO: "NONE_MATCH" }
                : {},
            companyVfpMatch
        );

        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const { start: monthStart, end: monthEnd } = monthBounds(now);
        const { start: yearStart, end: yearEnd } = yearBounds(now);

        const isTodayInsideFY = !startDate || !endDate || (today >= startDate && today <= endDate);
        const todayQuery = isTodayInsideFY ? { DATE: today } : { _id: { $exists: false } };

        let monthQuery: Record<string, any>;
        if (startDate && endDate) {
            const mStart = monthStart > startDate ? monthStart : startDate;
            const mEnd = today < endDate ? today : endDate;
            monthQuery = mStart <= mEnd ? { DATE: { $gte: mStart, $lte: mEnd } } : { _id: { $exists: false } };
        } else {
            monthQuery = { DATE: { $gte: monthStart, $lte: monthEnd } };
        }

        const yearQuery = startDate && endDate
            ? { DATE: { $gte: startDate, $lte: endDate } }
            : { DATE: { $gte: yearStart, $lte: yearEnd } };

        // Non-date filters only (customer/invoice/area/route/dsm), so they can
        // be combined with the fixed today/month/year windows below.
        const mdisNonDateFilter = buildFilter(
            { ...filters, dateFrom: undefined, dateTo: undefined },
            { customer: "CODEP", invoice: "VCN", area: "AREA", route: "ROUT", dsm: "DSM" }
        );
        const mdisNonDateRealOrderFilter = { ...mdisNonDateFilter, ...REAL_ORDER_FILTER };

        const [
            // ---- 12 KPI cards ----
            totalOrders,
            todaysOrders,
            monthlyOrders,
            yearlyOrders,
            totalSaleAgg,
            pendingOutstandingAgg,
            deliveredCount,
            totalCustomers,
            totalProductsSoldAgg,
            totalCollectionAgg,
            outstandingAgg,
            cancelledOrders,

            // ---- Order Summary + Latest Orders ----
            orderSummary,
            latestOrders,

            // ---- Order Items (joined to PRO + PROBAT) ----
            orderItems,

            // ---- Payment Details ----
            paymentDetails,

            // ---- Dispatch Details ----
            dispatchDetails,

            // ---- Charts ----
            ordersTrend,
            dailySales,
            topCustomers,
            topProducts,
            collectionTrend,

            // ---- Filter dropdown options (only non-null values, per table) ----
            dsmOptionsDis,
            dsmOptionsSubdis,
            areaOptionsOrder, // ORDER.CITY used as the practical "area" stand-in
        ] = await Promise.all([
            // Total Orders — excludes TYPE:"V" void/unposted vouchers now.
            SalesMdis.countDocuments(mdisRealOrderFilter),

            SalesMdis.countDocuments(combineFilters(mdisNonDateRealOrderFilter, todayQuery, companyVfpMatch)),

            SalesMdis.countDocuments(combineFilters(mdisNonDateRealOrderFilter, monthQuery, companyVfpMatch)),

            SalesMdis.countDocuments(combineFilters(mdisNonDateRealOrderFilter, yearQuery, companyVfpMatch)),

            SalesMdis.aggregate([
                { $match: mdisRealOrderFilter },
                { $group: { _id: null, total: { $sum: "$FINAL" } } },
            ]),

            Pend.countDocuments({ ...pendFilter, FINAL: { $gt: 0 } }),

            // TODO: proxy only — SUBDIS has no delivered/in-transit flag yet.
            SubDis.countDocuments(subdisFilter),

            Order.countDocuments({ _vfpDeleted: { $ne: true } }),

            SalesDis.aggregate([
                { $match: disFilter },
                { $group: { _id: null, totalQty: { $sum: "$QTY" } } },
            ]),

            GlLedger.aggregate([
                { $match: gledgerFilter },
                { $group: { _id: null, total: { $sum: "$CREDIT" } } },
            ]),

            Pend.aggregate([
                { $match: pendFilter },
                { $group: { _id: null, net: { $sum: "$FINAL" } } },
            ]),

            // Cancelled Orders — TYPE:"V" rows verified to be unposted/void
            // vouchers (no DATE, no VCN). Previously a hardcoded null TODO.
            SalesMdis.countDocuments({ ...mdisFilter, ...VOID_ORDER_FILTER }),

            // Order Summary (last 20, filtered) — real orders only.
            SalesMdis.find(mdisRealOrderFilter)
                .select(
                    "VCN VOUCHER DATE CODEP ROUT DSM NOCS FINAL COST STAXAMO CGSTAMO ADDISAMO DISCOUNT"
                )
                .sort({ DATE: -1 })
                .limit(20)
                .lean(),

            // Latest Orders (last 10, filtered) — real orders only.
            SalesMdis.find(mdisRealOrderFilter)
                .select("VCN VOUCHER DATE CODEP ROUT DSM FINAL NOCS")
                .sort({ DATE: -1 })
                .limit(10)
                .lean(),

            // Order Items (last 20, filtered, joined to PRO + PROBAT)
            SalesDis.aggregate([
                { $match: disFilter },
                { $sort: { DATE: -1 } },
                { $limit: 20 },
                {
                    $lookup: {
                        from: Product.collection.name,
                        localField: "CODE",
                        foreignField: "CODE",
                        as: "productInfo",
                    },
                },
                {
                    $lookup: {
                        from: ProductBatch.collection.name,
                        let: { prodCode: "$CODE", batchNo: "$BATCH" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$CODE", "$$prodCode"] },
                                            { $eq: ["$BATCHNO", "$$batchNo"] },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "batchInfo",
                    },
                },
                { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$batchInfo", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        VCN: 1,
                        DATE: 1,
                        CODE: 1,
                        BATCH: 1,
                        QTY: 1,
                        RATE: 1,
                        MRP: 1,
                        DISC1: 1,
                        DISC2: 1,
                        SSTAAMO: 1,
                        AMMMOUNT: 1,
                        productName: {
                            $ifNull: ["$productInfo.PRODUCT", "$productInfo.BILLNAME"],
                        },
                        batchExpiry: "$batchInfo.EXP",
                        batchMrp: "$batchInfo.MRP",
                        batchBalance: "$batchInfo.BALANCE",
                    },
                },
            ]),

            // Payment Details (last 10, filtered — date + customer(CODE) only)
            GlLedger.find(gledgerFilter)
                .select("VOUCHER CODE DATE DEBIT CREDIT REMARK1 TYPE")
                .sort({ DATE: -1 })
                .limit(10)
                .lean(),

            // Dispatch Details (last 10, filtered)
            SubDis.find(subdisFilter)
                .select("VCN VOUCHER DATE CODEP DSM ROUT TYPE BOOK")
                .sort({ DATE: -1 })
                .limit(10)
                .lean(),

            // Orders Trend (daily order count, last 30 days, filtered) — real orders only.
            SalesMdis.aggregate([
                { $match: mdisRealOrderFilter },
                { $group: { _id: "$DATE", orders: { $sum: 1 } } },
                { $sort: { _id: -1 } },
                { $limit: 30 },
            ]),

            // Daily Sales (sum FINAL per day, last 30 days, filtered) — real orders only.
            SalesMdis.aggregate([
                { $match: mdisRealOrderFilter },
                { $group: { _id: "$DATE", sales: { $sum: "$FINAL" } } },
                { $sort: { _id: -1 } },
                { $limit: 30 },
            ]),

            // Top Customers (filtered) — real orders only.
            SalesMdis.aggregate([
                { $match: mdisRealOrderFilter },
                {
                    $group: {
                        _id: "$CODEP",
                        sale: { $sum: "$FINAL" },
                        invoices: { $sum: 1 },
                    },
                },
                { $sort: { sale: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: Order.collection.name,
                        localField: "_id",
                        foreignField: "SCODE",
                        as: "customer",
                    },
                },
            ]),

            // Top Products (filtered)
            SalesDis.aggregate([
                { $match: disFilter },
                {
                    $group: {
                        _id: "$CODE",
                        qty: { $sum: "$QTY" },
                        amount: { $sum: "$AMMMOUNT" },
                    },
                },
                { $sort: { amount: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: Product.collection.name,
                        localField: "_id",
                        foreignField: "CODE",
                        as: "product",
                    },
                },
            ]),

            // Collection trend (filtered)
            GlLedger.aggregate([
                { $match: gledgerFilter },
                { $group: { _id: "$DATE", credit: { $sum: "$CREDIT" } } },
                { $sort: { _id: -1 } },
                { $limit: 30 },
            ]),

            // Dropdown options — only non-null distinct values, excluding soft-deleted rows.
            SalesDis.distinct("DSM", { DSM: { $ne: null }, _vfpDeleted: { $ne: true } }),
            SubDis.distinct("DSM", { DSM: { $ne: null }, _vfpDeleted: { $ne: true } }),
            Order.distinct("CITY", { CITY: { $ne: null }, _vfpDeleted: { $ne: true } }),
        ]);

        const dsmOptions = Array.from(
            new Set([...dsmOptionsDis, ...dsmOptionsSubdis])
        ).sort();

        const response = {
            success: true,

            kpiCards: {
                totalOrders,
                todaysOrders,
                monthlyOrders,
                yearlyOrders,
                totalSales: totalSaleAgg[0]?.total || 0,
                pendingOrders: pendingOutstandingAgg,
                deliveredOrders: deliveredCount,
                cancelledOrders, // now a real count of TYPE:"V" void/unposted vouchers
                totalCustomers,
                totalProductsSold: totalProductsSoldAgg[0]?.totalQty || 0,
                totalCollection: totalCollectionAgg[0]?.total || 0,
                outstanding: outstandingAgg[0]?.net || 0,
            },

            orderSummary,
            latestOrders,
            orderItems,
            paymentDetails,
            dispatchDetails,

            charts: {
                ordersTrend: ordersTrend.reverse(),
                dailySales: dailySales.reverse(),
                topCustomers,
                topProducts,
                collectionTrend: collectionTrend.reverse(),
                orderStatus: null, // TODO: still needs a broader status breakdown definition
            },

            // So the frontend selects can be populated with real values
            // instead of a hardcoded, always-empty "All Areas" option.
            filterOptions: {
                dsm: dsmOptions,
                area: areaOptionsOrder.sort(), // stand-in for AREA (currently all-null)
                route: [] as string[], // ROUT is all-null everywhere in this export
            },

            appliedFilters: filters,
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error(error);

        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}