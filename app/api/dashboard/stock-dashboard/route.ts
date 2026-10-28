/**
 * app/api/dashboard/stock/route.ts
 * -----------------------------------------------------------------------
 * GET /api/dashboard/stock
 *
 * Returns everything needed for the Stock Dashboard in ONE response:
 *   - kpis            (12 KPI cards)
 *   - stockSummary
 *   - lowStock
 *   - outOfStock
 *   - nearExpiry
 *   - expiredStock
 *   - topSelling
 *   - slowMoving
 *   - stockValueByCompany
 *   - latestDispatch
 *   - latestSales
 *   - recentActivity
 *
 * If you'd rather hit these individually (as originally listed:
 * /low-stock, /out-stock, /expiry, /top-products, /latest-sales,
 * /dispatch) just split the corresponding block below into its own
 * route file — the aggregation logic is self-contained per section.
 * -----------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import {
    Product,
    ProductBatch,
    SalesDis,
    SalesMdis,
    GLedger,
    Order,
    Pend,
    SubDis,
} from "@/models/StockModels";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

// ---- date helpers (data is stored as "YYYY-MM-DD" strings) ----------
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
function addDaysStr(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}
function daysBetween(dateStr: string) {
    const diff =
        (new Date(dateStr).getTime() - new Date(todayStr()).getTime()) /
        (1000 * 60 * 60 * 24);
    return Math.ceil(diff);
}

const NEAR_EXPIRY_WINDOW_DAYS = 90; // adjust as needed
const SLOW_MOVING_DAYS = 90; // no sale in last N days = slow moving

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";
import { fetchWithServerCache } from "@/lib/serverCache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get("companyId") || "ALL";
        const fyId = searchParams.get("fyId") || "ALL";
        const startDateParam = searchParams.get("startDate") || "";
        const endDateParam = searchParams.get("endDate") || "";

        const cacheKey = `stock-dashboard:${companyId}:${fyId}:${startDateParam}:${endDateParam}`;

        const payload = await fetchWithServerCache(
            cacheKey,
            30, // 30s cache
            async () => {
                const companyVfpMatch = await getCompanyVfpFilter(searchParams);
                const fyRange = await getFYDateRange(searchParams);
                const { startDate, endDate } = fyRange;
                const dateMatchDIS = buildFYDateQuery("DATE", startDate, endDate);
                const isTodayInsideFY = !!startDate && !!endDate && todayStr() >= startDate && todayStr() <= endDate;
                const todayMatch = isTodayInsideFY ? { DATE: todayStr() } : { _id: { $exists: false } };
                const restriction = await getMrTerritoryRestriction();

        const productFilter: any = combineFilters(
            restriction.isMrRestricted
                ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                    ? { GCODE: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                    : { GCODE: "NONE_MATCH" }
                : {},
            companyVfpMatch
        );

        const batchFilter: any = combineFilters(
            restriction.isMrRestricted
                ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                    ? { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                    : restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                    ? { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                    : { CODEP: "NONE_MATCH" }
                : {},
            companyVfpMatch
        );

        const disFilter: any = combineFilters(
            restriction.isMrRestricted
                ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                    ? { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                    : restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                    ? { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                    : { CODEP: "NONE_MATCH" }
                : {},
            companyVfpMatch
        );

        const mdisFilter: any = combineFilters(
            restriction.isMrRestricted
                ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                    ? { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                    : restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                    ? { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                    : { CODEP: "NONE_MATCH" }
                : {},
            companyVfpMatch
        );

        const orderFilter: any = combineFilters(
            restriction.isMrRestricted
                ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                    ? { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                    : { CODEP: "NONE_MATCH" }
                : {},
            companyVfpMatch
        );

        const gledgerFilter: any = combineFilters(
            restriction.isMrRestricted
                ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                    ? { CODE: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                    : { CODE: "NONE_MATCH" }
                : {},
            companyVfpMatch
        );

        const pendFilter: any = combineFilters(
            restriction.isMrRestricted
                ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                    ? { ORD: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                    : { ORD: "NONE_MATCH" }
                : {},
            companyVfpMatch
        );

        const today = todayStr();
        const nearExpiryLimit = addDaysStr(NEAR_EXPIRY_WINDOW_DAYS);
        const slowMovingCutoff = addDaysStr(-SLOW_MOVING_DAYS);

        /* ================= 1. KPI CARDS ================= */
        const [
            totalProducts,
            totalBatches,
            stockAgg,
            lowStockCount,
            outOfStockCount,
            nearExpiryCount,
            expiredCount,
            todayDispatchCount,
            todaySalesAgg,
            companyCodes,
        ] = await Promise.all([
            Product.countDocuments(productFilter),
            ProductBatch.countDocuments(batchFilter),
            ProductBatch.aggregate([
                { $match: batchFilter },
                {
                    $group: {
                        _id: null,
                        qty: { $sum: { $ifNull: ["$BALANCE", 0] } },
                        value: {
                            $sum: {
                                $multiply: [
                                    { $ifNull: ["$BALANCE", 0] },
                                    { $ifNull: ["$MRP", 0] },
                                ],
                            },
                        },
                    },
                },
            ]),
            Product.countDocuments({
                ...productFilter,
                $expr: {
                    $and: [
                        { $gt: ["$MINIMUM", 0] },
                        { $lte: [{ $ifNull: ["$BALANCE", 0] }, "$MINIMUM"] },
                    ],
                },
            }),
            Product.countDocuments({ ...productFilter, BALANCE: { $lte: 0 } }),
            ProductBatch.countDocuments({
                ...batchFilter,
                BALANCE: { $gt: 0 },
                EXP: { $gte: today, $lte: nearExpiryLimit },
            }),
            ProductBatch.countDocuments({
                ...batchFilter,
                BALANCE: { $gt: 0 },
                EXP: { $lt: today, $ne: null },
            }),
            SubDis.countDocuments(combineFilters(disFilter, todayMatch)),
            SalesDis.aggregate([
                { $match: combineFilters(disFilter, todayMatch) },
                {
                    $group: {
                        _id: null,
                        qty: { $sum: { $ifNull: ["$QTY", 0] } },
                        value: { $sum: { $ifNull: ["$AMMMOUNT", 0] } },
                    },
                },
            ]),
            Product.distinct("GCODE", productFilter),
        ]);

        const kpis = {
            totalProducts,
            totalBatches,
            currentStockQty: stockAgg[0]?.qty ?? 0,
            currentStockValue: stockAgg[0]?.value ?? 0,
            lowStockItems: lowStockCount,
            outOfStock: outOfStockCount,
            nearExpiry: nearExpiryCount,
            expiredProducts: expiredCount,
            todaysDispatch: todayDispatchCount,
            todaysSalesQty: todaySalesAgg[0]?.qty ?? 0,
            todaysSaleValue: todaySalesAgg[0]?.value ?? 0,
            totalCompanies: companyCodes.filter(Boolean).length,
        };

        /* ================= 2. STOCK SUMMARY ================= */
        const [openingAgg, salesAgg] = await Promise.all([
            Product.aggregate([
                { $match: productFilter },
                { $group: { _id: null, opening: { $sum: { $ifNull: ["$OPENING", 0] } } } },
            ]),
            SalesDis.aggregate([
                { $match: combineFilters(disFilter, dateMatchDIS) },
                { $group: { _id: null, sold: { $sum: { $ifNull: ["$ISSUEQTY", 0] } } } },
            ]),
        ]);

        const stockSummary = {
            openingStock: openingAgg[0]?.opening ?? 0,
            purchaseStock: null, // TODO: no dedicated purchase table was supplied (e.g. PUR/MPUR)
            salesStock: salesAgg[0]?.sold ?? 0,
            availableStock: kpis.currentStockQty,
            reservedStock: null, // TODO: not present in source data — needs a status flag or ORDER-pending join
            blockedStock: null, // TODO: could map to PROBAT.HOLD once its meaning is confirmed
            dispatchStock: null, // TODO: aggregate from SUBDIS qty once a qty field is confirmed there
            damagedStock: null, // TODO: no damage/adjustment table supplied
        };

        /* ================= 3. LOW STOCK ================= */
        const lowStockRaw = await Product.find({
            ...productFilter,
            $expr: {
                $and: [
                    { $gt: ["$MINIMUM", 0] },
                    { $lte: [{ $ifNull: ["$BALANCE", 0] }, "$MINIMUM"] },
                ],
            },
        })
            .select("CODE PRODUCT GCODE BALANCE MINIMUM")
            .limit(50)
            .lean();

        const lowStockCodes = lowStockRaw.map((p) => p.CODE);
        const lastSaleByCode = await SalesDis.aggregate([
            { $match: { ...disFilter, CODE: { $in: lowStockCodes } } },
            { $sort: { DATE: -1 } },
            { $group: { _id: "$CODE", lastSaleDate: { $first: "$DATE" } } },
        ]);
        const lastSaleMap = new Map(
            lastSaleByCode.map((d) => [d._id, d.lastSaleDate])
        );

        const lowStock = lowStockRaw.map((p: any) => ({
            product: p.PRODUCT,
            company: p.GCODE,
            currentQty: p.BALANCE ?? 0,
            minimumQty: p.MINIMUM ?? 0,
            requiredQty: Math.max((p.MINIMUM ?? 0) - (p.BALANCE ?? 0), 0),
            lastSaleDate: lastSaleMap.get(p.CODE) ?? null,
        }));

        /* ================= 4. OUT OF STOCK ================= */
        const outOfStockRaw = await Product.find({ ...productFilter, BALANCE: { $lte: 0 } })
            .select("CODE PRODUCT GCODE MRP")
            .limit(50)
            .lean();
        const oosCodes = outOfStockRaw.map((p) => p.CODE);

        const [lastSaleOos, lastBatchOos] = await Promise.all([
            SalesDis.aggregate([
                { $match: { ...disFilter, CODE: { $in: oosCodes } } },
                { $sort: { DATE: -1 } },
                { $group: { _id: "$CODE", lastSaleDate: { $first: "$DATE" } } },
            ]),
            ProductBatch.aggregate([
                { $match: { ...batchFilter, CODE: { $in: oosCodes } } },
                { $sort: { DATE: -1 } },
                { $group: { _id: "$CODE", lastBatch: { $first: "$BATCHNO" } } },
            ]),
        ]);
        const lastSaleOosMap = new Map(lastSaleOos.map((d) => [d._id, d.lastSaleDate]));
        const lastBatchOosMap = new Map(lastBatchOos.map((d) => [d._id, d.lastBatch]));

        const outOfStock = outOfStockRaw.map((p: any) => ({
            product: p.PRODUCT,
            company: p.GCODE,
            lastSaleDate: lastSaleOosMap.get(p.CODE) ?? null,
            batch: lastBatchOosMap.get(p.CODE) ?? null,
            mrp: p.MRP ?? 0,
        }));

        /* ================= 5. NEAR EXPIRY ================= */
        const nearExpiryRaw = await ProductBatch.find({
            ...batchFilter,
            BALANCE: { $gt: 0 },
            EXP: { $gte: today, $lte: nearExpiryLimit },
        })
            .select("CODE PRODUCT BATCHNO EXP BALANCE MRP")
            .sort({ EXP: 1 })
            .limit(50)
            .lean();

        const nearExpiry = nearExpiryRaw.map((b: any) => ({
            batch: b.BATCHNO,
            product: b.PRODUCT,
            expiryDate: b.EXP,
            daysLeft: daysBetween(b.EXP),
            stockQty: b.BALANCE ?? 0,
            stockValue: (b.BALANCE ?? 0) * (b.MRP ?? 0),
        }));

        /* ================= 6. EXPIRED STOCK ================= */
        const expiredRaw = await ProductBatch.find({
            ...batchFilter,
            BALANCE: { $gt: 0 },
            EXP: { $lt: today, $ne: null },
        })
            .select("CODE PRODUCT BATCHNO EXP BALANCE MRP")
            .sort({ EXP: -1 })
            .limit(50)
            .lean();

        const expiredStock = expiredRaw.map((b: any) => ({
            product: b.PRODUCT,
            batch: b.BATCHNO,
            expiryDate: b.EXP,
            qty: b.BALANCE ?? 0,
            mrp: b.MRP ?? 0,
            value: (b.BALANCE ?? 0) * (b.MRP ?? 0),
        }));

        /* ================= 7. TOP SELLING PRODUCTS ================= */
        const topSellingAgg = await SalesDis.aggregate([
            { $match: combineFilters(disFilter, dateMatchDIS) },
            {
                $group: {
                    _id: "$CODE",
                    qtySold: { $sum: { $ifNull: ["$QTY", 0] } },
                    saleValue: { $sum: { $ifNull: ["$AMMMOUNT", 0] } },
                    avgRate: { $avg: { $ifNull: ["$RATE", 0] } },
                },
            },
            { $sort: { qtySold: -1 } },
            { $limit: 10 },
        ]);
        const topSellingCodes = topSellingAgg.map((d) => d._id);
        const topSellingProducts = await Product.find({
            ...productFilter,
            CODE: { $in: topSellingCodes },
        })
            .select("CODE PRODUCT")
            .lean();
        const productNameMap = new Map(
            topSellingProducts.map((p: any) => [p.CODE, p.PRODUCT])
        );

        const topSelling = topSellingAgg.map((d) => ({
            product: productNameMap.get(d._id) ?? `Code ${d._id}`,
            qtySold: d.qtySold,
            saleValue: d.saleValue,
            averageRate: Math.round((d.avgRate ?? 0) * 100) / 100,
        }));

        /* ================= 8. SLOW MOVING PRODUCTS ================= */
        const lastSaleAll = await SalesDis.aggregate([
            { $match: combineFilters(disFilter, dateMatchDIS) },
            { $sort: { DATE: -1 } },
            { $group: { _id: "$CODE", lastSaleDate: { $first: "$DATE" } } },
        ]);
        const lastSaleAllMap = new Map(lastSaleAll.map((d) => [d._id, d.lastSaleDate]));

        const slowMovingCandidates = await Product.find({ ...productFilter, BALANCE: { $gt: 0 } })
            .select("CODE PRODUCT BALANCE MRP")
            .lean();

        const slowMoving = slowMovingCandidates
            .filter((p: any) => {
                const last = lastSaleAllMap.get(p.CODE);
                return !last || last < slowMovingCutoff;
            })
            .slice(0, 50)
            .map((p: any) => ({
                product: p.PRODUCT,
                lastSaleDate: lastSaleAllMap.get(p.CODE) ?? null,
                currentStock: p.BALANCE ?? 0,
                stockValue: (p.BALANCE ?? 0) * (p.MRP ?? 0),
            }));

        /* ================= 9. STOCK VALUE BY COMPANY ================= */
        const stockValueByCompanyAgg = await Product.aggregate([
            { $match: productFilter },
            {
                $lookup: {
                    from: "vfp_new_folder_probat",
                    let: { pCode: "$CODE" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$CODE", "$$pCode"] } } },
                        ...(batchFilter._vfpTable ? [{ $match: { _vfpTable: batchFilter._vfpTable } }] : []),
                        ...(batchFilter.$or ? [{ $match: { $or: batchFilter.$or } }] : []),
                    ],
                    as: "batches",
                },
            },
            {
                $group: {
                    _id: "$GCODE",
                    totalQty: { $sum: { $sum: "$batches.BALANCE" } },
                    mrpValue: {
                        $sum: {
                            $sum: {
                                $map: {
                                    input: "$batches",
                                    as: "b",
                                    in: {
                                        $multiply: [
                                            { $ifNull: ["$$b.BALANCE", 0] },
                                            { $ifNull: ["$$b.MRP", 0] },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                    purchaseValue: {
                        $sum: {
                            $sum: {
                                $map: {
                                    input: "$batches",
                                    as: "b",
                                    in: {
                                        $multiply: [
                                            { $ifNull: ["$$b.BALANCE", 0] },
                                            { $ifNull: ["$$b.LPRATE", 0] },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
            },
            { $sort: { mrpValue: -1 } },
            { $limit: 20 },
        ]);

        const stockValueByCompany = stockValueByCompanyAgg.map((c) => ({
            company: c._id,
            totalQty: c.totalQty,
            mrpValue: c.mrpValue,
            purchaseValue: c.purchaseValue,
            saleValue: null, // TODO: derive from DIS if you want realised sale value per company
        }));

        /* ================= 10. LATEST DISPATCH ================= */
        const latestDispatchRaw = await SubDis.find(disFilter)
            .select("VCN DATE CODEP GODWON")
            .sort({ DATE: -1 })
            .limit(10)
            .lean();
        const dispatchCustCodes = latestDispatchRaw.map((d: any) => d.CODEP);
        const dispatchCustomers = await Order.find({
            ...orderFilter,
            CODEP: { $in: dispatchCustCodes },
        })
            .select("CODEP PARNAM")
            .lean();
        const custNameMap = new Map(
            dispatchCustomers.map((c: any) => [c.CODEP, c.PARNAM])
        );

        const latestDispatch = latestDispatchRaw.map((d: any) => ({
            invoice: d.VCN,
            date: d.DATE,
            customer: custNameMap.get(d.CODEP) ?? d.CODEP,
            status: d.GODWON ?? "Dispatched",
        }));

        /* ================= 11. LATEST SALES INVOICES ================= */
        const latestSalesRaw = await SalesMdis.find(mdisFilter)
            .select("VCN DATE CODEP FINAL")
            .sort({ DATE: -1 })
            .limit(10)
            .lean();
        const salesCustCodes = latestSalesRaw.map((m: any) => m.CODEP);
        const salesCustomers = await Order.find({ ...orderFilter, CODEP: { $in: salesCustCodes } })
            .select("CODEP PARNAM")
            .lean();
        const salesCustNameMap = new Map(
            salesCustomers.map((c: any) => [c.CODEP, c.PARNAM])
        );

        const latestSales = latestSalesRaw.map((m: any) => ({
            invoice: m.VCN,
            customer: salesCustNameMap.get(m.CODEP) ?? m.CODEP,
            amount: m.FINAL ?? 0,
            date: m.DATE,
        }));

        /* ================= 12. RECENT ACTIVITY (basic feed) ================= */
        const [recentBatches, recentDispatch, recentSales] = await Promise.all([
            ProductBatch.find(batchFilter).select("PRODUCT BATCHNO DATE").sort({ DATE: -1 }).limit(5).lean(),
            SubDis.find(disFilter).select("VCN DATE").sort({ DATE: -1 }).limit(5).lean(),
            SalesMdis.find(mdisFilter).select("VCN DATE FINAL").sort({ DATE: -1 }).limit(5).lean(),
        ]);

        const recentActivity = [
            ...recentBatches.map((b: any) => ({
                type: "New Batch",
                description: `${b.PRODUCT ?? ""} — Batch ${b.BATCHNO ?? ""}`,
                date: b.DATE,
            })),
            ...recentDispatch.map((d: any) => ({
                type: "Dispatch",
                description: `Invoice ${d.VCN ?? ""} dispatched`,
                date: d.DATE,
            })),
            ...recentSales.map((s: any) => ({
                type: "Sales",
                description: `Invoice ${s.VCN ?? ""} — ₹${s.FINAL ?? 0}`,
                date: s.DATE,
            })),
        ]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 10);

        /* ================= 13. FINANCIAL LEDGER SUMMARY (GLEDGER) ================= */
        const [ledgerTotalsAgg, recentLedgerRaw] = await Promise.all([
            GLedger.aggregate([
                { $match: gledgerFilter },
                {
                    $group: {
                        _id: null,
                        totalDebit: { $sum: { $ifNull: ["$DEBIT", 0] } },
                        totalCredit: { $sum: { $ifNull: ["$CREDIT", 0] } },
                        entries: { $sum: 1 },
                    },
                },
            ]),
            GLedger.find(gledgerFilter)
                .select("CODE CODE1 DATE DEBIT CREDIT TYPE BOOK REMARK1 VOUCHER")
                .sort({ DATE: -1 })
                .limit(10)
                .lean(),
        ]);

        const financialSummary = {
            totalDebit: ledgerTotalsAgg[0]?.totalDebit ?? 0,
            totalCredit: ledgerTotalsAgg[0]?.totalCredit ?? 0,
            netBalance:
                (ledgerTotalsAgg[0]?.totalDebit ?? 0) - (ledgerTotalsAgg[0]?.totalCredit ?? 0),
            totalEntries: ledgerTotalsAgg[0]?.entries ?? 0,
            recentEntries: recentLedgerRaw.map((g: any) => ({
                voucher: g.VOUCHER,
                code: g.CODE,
                code1: g.CODE1,
                date: g.DATE,
                debit: g.DEBIT ?? 0,
                credit: g.CREDIT ?? 0,
                type: g.TYPE,
                book: g.BOOK,
                remark: g.REMARK1,
            })),
        };

        /* ================= 14. PENDING VOUCHERS / ADJUSTMENTS (PEND) ================= */
        const [pendTotalsAgg, recentPendRaw] = await Promise.all([
            Pend.aggregate([
                { $match: pendFilter },
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: { $ifNull: ["$FINAL", 0] } },
                        count: { $sum: 1 },
                    },
                },
            ]),
            Pend.find(pendFilter)
                .select("VOUCHER SVOUCHER ADJVOUCHER DDATE FINAL ORD TYPE VCN")
                .sort({ DDATE: -1 })
                .limit(10)
                .lean(),
        ]);

        const pendingAdjustments = {
            totalPendingVouchers: pendTotalsAgg[0]?.count ?? 0,
            totalPendingValue: pendTotalsAgg[0]?.totalValue ?? 0,
            recent: recentPendRaw.map((p: any) => ({
                voucher: p.VOUCHER,
                svoucher: p.SVOUCHER,
                adjVoucher: p.ADJVOUCHER,
                date: p.DDATE,
                amount: p.FINAL ?? 0,
                orderRef: p.ORD,
                type: p.TYPE,
                vcn: p.VCN,
            })),
        };

                return {
                    success: true,
                    generatedAt: new Date().toISOString(),
                    kpis,
                    stockSummary,
                    lowStock,
                    outOfStock,
                    nearExpiry,
                    expiredStock,
                    topSelling,
                    slowMoving,
                    stockValueByCompany,
                    latestDispatch,
                    latestSales,
                    recentActivity,
                    financialSummary,
                    pendingAdjustments,
                };
            }
        );

        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("Stock dashboard API error:", error);
        return NextResponse.json(
            { success: false, error: error?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}