import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Product, ProductBatch } from "@/models/StockModels";
import StockBalance from "@/models/StockBalance";
import SaleType from "@/models/SaleType";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const search = (searchParams.get("q") || searchParams.get("search") || "").trim();
        const filter = (searchParams.get("filter") || "all").toLowerCase(); // all, in_stock, low_stock, out_of_stock
        const company = (searchParams.get("company") || "").trim();
        const view = (searchParams.get("view") || "product").toLowerCase(); // product, batch
        const rateType = (searchParams.get("rateType") || "prate").toLowerCase(); // prate, lprate, mrp, ratef
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "50", 10)));
        const sortBy = searchParams.get("sortBy") || "PRODUCT";
        const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;

        // Dynamic rate expression builder for MongoDB aggregation
        const getRateExpr = (rType: string) => {
            if (rType === "mrp") return { $ifNull: ["$MRP", 0] };
            if (rType === "lprate") return { $ifNull: ["$LPRATE", { $ifNull: ["$PRATE", { $ifNull: ["$MRP", 0] }] }] };
            if (rType === "ratef" || rType === "sale") return { $ifNull: ["$RATEF", { $ifNull: ["$RATE", { $ifNull: ["$PRATE", { $ifNull: ["$MRP", 0] }] }] }] };
            return { $ifNull: ["$PRATE", { $ifNull: ["$RATEF", { $ifNull: ["$MRP", 0] }] }] };
        };

        // 1. Resolve MR Territory restrictions
        const restriction = await getMrTerritoryRestriction();

        // Prefer the new StockBalance ledger when the selected Company + FY has
        // ledger rows. This makes the existing Stock Overview reflect the same
        // balance used by Opening Stock / Purchase / Sale / Return.
        const ledgerCompanyId = String(searchParams.get("companyId") || "").trim();
        const ledgerFyId = String(searchParams.get("fyId") || "").trim();
        if (ledgerCompanyId && ledgerFyId) {
            const stockQuery: any = { companyId: ledgerCompanyId, fyId: ledgerFyId };
            if (restriction.isMrRestricted) {
                if (restriction.allowedCompanyCodes?.length) {
                    stockQuery.companyCode = { $in: restriction.allowedCompanyCodes };
                } else {
                    stockQuery.productCode = "__NO_ACCESS__";
                }
            }
            if (company) stockQuery.companyCode = company;
            if (search) {
                const sr = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
                stockQuery.$or = [{ productCode: sr }, { productName: sr }, { batchNo: sr }];
            }
            const ledgerCount = await StockBalance.countDocuments(stockQuery);
            if (ledgerCount > 0) {
                if (view === "batch") {
                    const rows: any[] = await StockBalance.find(stockQuery).sort({ productName: sortOrder, batchNo: 1 }).skip((page - 1) * limit).limit(limit).lean();
                    const totalQty = rows.reduce((s, x) => s + Number(x.currentQty || 0), 0);
                    const items = rows.map((x: any) => ({
                        id: String(x._id), code: x.productCode, product: x.productName || "Unknown Product",
                        batchNo: x.batchNo || "N/A", expiryDate: x.expiry || null, mfd: x.mfgDate || null,
                        packing: "", mrp: Number(x.mrp || 0), prate: Number(x.rate || 0), lprate: Number(x.rate || 0), ratef: Number(x.rate || 0),
                        selectedRate: rateType === "mrp" ? Number(x.mrp || 0) : Number(x.rate || x.mrp || 0),
                        balance: Number(x.currentQty || 0), stockValue: Number(x.currentQty || 0) * Number(x.rate || x.mrp || 0),
                        status: Number(x.currentQty || 0) <= 0 ? "out_of_stock" : Number(x.currentQty || 0) <= 10 ? "low_stock" : "in_stock",
                        companyCode: x.companyCode || "", companyName: x.companyCode || "",
                    }));
                    return NextResponse.json({ success: true, view: "batch", items, pagination: { page, limit, totalCount: ledgerCount, totalPages: Math.ceil(ledgerCount / limit) || 1 }, summary: { totalStockQty: totalQty, totalStockValue: rows.reduce((s,x)=>s + Number(x.currentQty||0)*Number(x.rate||x.mrp||0),0), totalItems: ledgerCount, inStockCount: rows.filter(x=>Number(x.currentQty||0)>0).length, outOfStockCount: rows.filter(x=>Number(x.currentQty||0)<=0).length } });
                }

                const grouped = await StockBalance.aggregate([
                    { $match: stockQuery },
                    { $group: { _id: "$productCode", productName: { $first: "$productName" }, companyCode: { $first: "$companyCode" }, mrp: { $max: "$mrp" }, rate: { $max: "$rate" }, balance: { $sum: "$currentQty" } } },
                    { $sort: { productName: sortOrder } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                ]);
                const productCountAgg = await StockBalance.aggregate([{ $match: stockQuery }, { $group: { _id: "$productCode" } }, { $count: "count" }]);
                const items = grouped.map((x: any) => ({
                    id: String(x._id), code: x._id, product: x.productName || "Unknown Product", company: x.companyCode || "",
                    currentQty: Number(x.balance || 0), balance: Number(x.balance || 0), mrp: Number(x.mrp || 0), prate: Number(x.rate || 0),
                    lprate: Number(x.rate || 0), ratef: Number(x.rate || 0), selectedRate: rateType === "mrp" ? Number(x.mrp || 0) : Number(x.rate || x.mrp || 0),
                    stockValue: Number(x.balance || 0) * Number(x.rate || x.mrp || 0), status: Number(x.balance || 0) <= 0 ? "out_of_stock" : Number(x.balance || 0) <= 10 ? "low_stock" : "in_stock",
                }));
                return NextResponse.json({ success: true, view: "product", items, pagination: { page, limit, totalCount: productCountAgg[0]?.count || 0, totalPages: Math.ceil((productCountAgg[0]?.count || 0) / limit) || 1 }, summary: { totalStockQty: items.reduce((s,x)=>s+x.balance,0), totalStockValue: items.reduce((s,x)=>s+x.stockValue,0), totalItems: productCountAgg[0]?.count || 0, inStockCount: items.filter(x=>x.balance>0).length, outOfStockCount: items.filter(x=>x.balance<=0).length } });
            }
        }

        // Build base company map from SaleType
        const saleTypes = await SaleType.find({}, { SCODE: 1, SNAME: 1 }).lean();
        const companyMap = new Map<string, string>();
        saleTypes.forEach((item: any) => {
            if (item.SCODE) {
                companyMap.set(String(item.SCODE).trim(), String(item.SNAME || "").trim());
            }
        });

        if (view === "batch") {
            // Batch-level query logic
            let batchFilter: any = { ...companyVfpMatch };

            if (restriction.isMrRestricted) {
                if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
                    const compRegexes = restriction.allowedCompanyCodes.map((code: string) => new RegExp(`_${code}$|^${code}$`, "i"));
                    batchFilter = combineFilters(batchFilter, {
                        $or: [
                            { _vfpTable: { $in: compRegexes } },
                            { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } },
                            { GCODE: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                        ]
                    });
                } else if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
                    batchFilter = combineFilters(batchFilter, { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } });
                } else {
                    batchFilter = combineFilters(batchFilter, { CODEP: "NONE_MATCH" });
                }
            }

            if (company) {
                const compRegex = new RegExp(`_${company}$|^${company}$`, "i");
                batchFilter = combineFilters(batchFilter, {
                    $or: [
                        { _vfpTable: compRegex },
                        { COMPANY: new RegExp(`^${company}$`, "i") },
                        { GCODE: new RegExp(`^${company}$`, "i") },
                        { companyCode: new RegExp(`^${company}$`, "i") }
                    ]
                });
            }

            if (search) {
                const searchRegex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
                const isNum = !isNaN(Number(search));
                const searchConds: any[] = [
                    { PRODUCT: searchRegex },
                    { BATCHNO: searchRegex },
                    { PACKING: searchRegex },
                ];
                if (isNum) {
                    searchConds.push({ CODE: Number(search) });
                }
                batchFilter = combineFilters(batchFilter, { $or: searchConds });
            }

            if (filter === "in_stock") {
                batchFilter.BALANCE = { $gt: 0 };
            } else if (filter === "out_of_stock") {
                batchFilter.BALANCE = { $lte: 0 };
            } else if (filter === "low_stock") {
                batchFilter.BALANCE = { $gt: 0, $lte: 10 }; // arbitrary low batch threshold
            }

            const sortOption: any = {};
            if (sortBy === "BALANCE" || sortBy === "qty") sortOption.BALANCE = sortOrder;
            else if (sortBy === "EXP") sortOption.EXP = sortOrder;
            else sortOption.PRODUCT = sortOrder;

            const [totalCount, batchDocs, summaryAgg] = await Promise.all([
                ProductBatch.countDocuments(batchFilter),
                ProductBatch.find(batchFilter)
                    .sort(sortOption)
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
                ProductBatch.aggregate([
                    { $match: batchFilter },
                    {
                        $group: {
                            _id: null,
                            totalQty: { $sum: { $ifNull: ["$BALANCE", 0] } },
                            totalValue: {
                                $sum: {
                                    $multiply: [
                                        { $ifNull: ["$BALANCE", 0] },
                                        getRateExpr(rateType)
                                    ]
                                }
                            },
                            inStock: {
                                $sum: {
                                    $cond: [{ $gt: ["$BALANCE", 0] }, 1, 0]
                                }
                            },
                            outOfStock: {
                                $sum: {
                                    $cond: [{ $lte: ["$BALANCE", 0] }, 1, 0]
                                }
                            }
                        }
                    }
                ])
            ]);

            const today = new Date().toISOString().slice(0, 10);
            const items = batchDocs.map((b: any) => {
                const bal = Number(b.BALANCE || 0);
                const mrp = Number(b.MRP || 0);
                const prate = Number(b.PRATE || 0);
                const lprate = Number(b.LPRATE || 0);
                const ratef = Number(b.RATEF || b.RATE || 0);

                let selectedRate = prate > 0 ? prate : mrp;
                if (rateType === "mrp") selectedRate = mrp;
                else if (rateType === "lprate") selectedRate = lprate > 0 ? lprate : (prate > 0 ? prate : mrp);
                else if (rateType === "ratef" || rateType === "sale") selectedRate = ratef > 0 ? ratef : (prate > 0 ? prate : mrp);

                const value = Math.round(bal * selectedRate);
                const exp = b.EXP || null;

                let status = "in_stock";
                if (bal <= 0) status = "out_of_stock";
                else if (exp && exp < today) status = "expired";
                else if (bal <= 10) status = "low_stock";

                return {
                    id: b._id.toString(),
                    code: b.CODE,
                    product: b.PRODUCT || "Unknown Product",
                    batchNo: b.BATCHNO || "N/A",
                    expiryDate: exp,
                    mfd: b.MFD || null,
                    packing: b.PACKING || "",
                    mrp,
                    prate,
                    lprate,
                    ratef,
                    selectedRate,
                    balance: bal,
                    stockValue: value,
                    status,
                    companyCode: b.COMPANY || b.GCODE || "",
                    companyName: companyMap.get(String(b.COMPANY || b.GCODE || "").trim()) || b.COMPANY || b.GCODE || "N/A",
                };
            });

            return NextResponse.json({
                success: true,
                view: "batch",
                items,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit) || 1,
                },
                summary: {
                    totalStockQty: summaryAgg[0]?.totalQty ?? 0,
                    totalStockValue: summaryAgg[0]?.totalValue ?? 0,
                    totalItems: totalCount,
                    inStockCount: summaryAgg[0]?.inStock ?? 0,
                    outOfStockCount: summaryAgg[0]?.outOfStock ?? 0,
                }
            });

        } else {
            // Product-level query logic (Default)
            let productFilter: any = { ...companyVfpMatch };

            if (restriction.isMrRestricted) {
                if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
                    productFilter.GCODE = { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] };
                } else {
                    productFilter.GCODE = "NONE_MATCH";
                }
            }

            if (company) {
                productFilter.GCODE = company;
            }

            if (search) {
                const searchRegex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
                const isNum = !isNaN(Number(search));
                const searchConds: any[] = [
                    { PRODUCT: searchRegex },
                    { GCODE: searchRegex },
                    { PACKING: searchRegex },
                ];
                if (isNum) {
                    searchConds.push({ CODE: Number(search) });
                }
                productFilter = combineFilters(productFilter, { $or: searchConds });
            }

            if (filter === "in_stock") {
                productFilter.BALANCE = { $gt: 0 };
            } else if (filter === "out_of_stock") {
                productFilter.BALANCE = { $lte: 0 };
            } else if (filter === "low_stock") {
                productFilter.$expr = {
                    $and: [
                        { $gt: ["$MINIMUM", 0] },
                        { $lte: [{ $ifNull: ["$BALANCE", 0] }, "$MINIMUM"] },
                    ],
                };
            }

            const sortOption: any = {};
            if (sortBy === "BALANCE" || sortBy === "qty") sortOption.BALANCE = sortOrder;
            else if (sortBy === "CODE") sortOption.CODE = sortOrder;
            else if (sortBy === "GCODE") sortOption.GCODE = sortOrder;
            else sortOption.PRODUCT = sortOrder;

            // Fetch list, count, summary KPIs, and list of distinct companies for filter dropdown
            const [totalCount, productDocs, summaryAgg, distinctGcodes] = await Promise.all([
                Product.countDocuments(productFilter),
                Product.find(productFilter)
                    .sort(sortOption)
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
                Product.aggregate([
                    { $match: productFilter },
                    {
                        $group: {
                            _id: null,
                            totalQty: { $sum: { $ifNull: ["$BALANCE", 0] } },
                            totalValue: {
                                $sum: {
                                    $multiply: [
                                        { $ifNull: ["$BALANCE", 0] },
                                        getRateExpr(rateType)
                                    ]
                                }
                            },
                            inStock: {
                                $sum: {
                                    $cond: [{ $gt: ["$BALANCE", 0] }, 1, 0]
                                }
                            },
                            outOfStock: {
                                $sum: {
                                    $cond: [{ $lte: ["$BALANCE", 0] }, 1, 0]
                                }
                            },
                            lowStock: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $gt: ["$MINIMUM", 0] },
                                                { $lte: [{ $ifNull: ["$BALANCE", 0] }, "$MINIMUM"] }
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ]),
                Product.distinct("GCODE", restriction.isMrRestricted && restriction.allowedCompanyCodes ? { GCODE: { $in: restriction.allowedCompanyCodes } } : {})
            ]);

            const companiesList = distinctGcodes
                .filter(Boolean)
                .map((gcode: string) => {
                    const code = String(gcode).trim();
                    return {
                        code,
                        name: companyMap.get(code) || code,
                    };
                })
                .sort((a: any, b: any) => a.name.localeCompare(b.name));

            const items = productDocs.map((p: any) => {
                const bal = Number(p.BALANCE || 0);
                const mrp = Number(p.MRP || 0);
                const prate = Number(p.PRATE || 0);
                const lprate = Number(p.LPRATE || 0);
                const ratef = Number(p.RATEF || p.RATE || 0);

                let selectedRate = prate > 0 ? prate : mrp;
                if (rateType === "mrp") selectedRate = mrp;
                else if (rateType === "lprate") selectedRate = lprate > 0 ? lprate : (prate > 0 ? prate : mrp);
                else if (rateType === "ratef" || rateType === "sale") selectedRate = ratef > 0 ? ratef : (prate > 0 ? prate : mrp);

                const min = Number(p.MINIMUM || 0);
                const gcode = p.GCODE ? String(p.GCODE).trim() : "";
                const value = Math.round(bal * selectedRate);

                let status = "in_stock";
                if (bal <= 0) {
                    status = "out_of_stock";
                } else if (min > 0 && bal <= min) {
                    status = "low_stock";
                }

                return {
                    id: p._id.toString(),
                    code: p.CODE,
                    product: p.PRODUCT || "Unknown Product",
                    gcode,
                    companyName: companyMap.get(gcode) || gcode || "N/A",
                    packing: p.PACKING || "",
                    unit: p.UNIT || "",
                    mrp,
                    prate,
                    lprate,
                    ratef,
                    selectedRate,
                    minimum: min,
                    balance: bal,
                    stockValue: value,
                    status,
                };
            });

            return NextResponse.json({
                success: true,
                view: "product",
                items,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit) || 1,
                },
                summary: {
                    totalStockQty: summaryAgg[0]?.totalQty ?? 0,
                    totalStockValue: summaryAgg[0]?.totalValue ?? 0,
                    totalItems: totalCount,
                    inStockCount: summaryAgg[0]?.inStock ?? 0,
                    lowStockCount: summaryAgg[0]?.lowStock ?? 0,
                    outOfStockCount: summaryAgg[0]?.outOfStock ?? 0,
                },
                companies: companiesList,
            });
        }
    } catch (error: any) {
        console.error("Current Stock API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
