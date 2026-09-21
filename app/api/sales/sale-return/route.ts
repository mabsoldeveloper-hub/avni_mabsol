import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import GLedger from "@/models/GLedger";
import Pendings from "@/models/Pendings";
import { combineFilters, getCompanyVfpFilter } from "@/lib/companyVfpHelper";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { consumeNextVoucherNumber, peekNextVoucherNumber } from "@/lib/voucherSeriesHelper";
import { getCurrentUser } from "@/lib/auth";
import { applyStockMovement } from "@/lib/stockService";

export const dynamic = "force-dynamic";

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function buildPartyConds(partyCode: string) {
    const isNum = !isNaN(Number(partyCode));
    const codeNum = isNum ? Number(partyCode) : null;
    const conds: any[] = [
        { CODEP: partyCode },
        { CODE: partyCode },
        { ORD: partyCode },
        { ORDNO: partyCode },
        { SCODE: partyCode },
    ];
    if (codeNum !== null) {
        conds.push({ CODEP: codeNum });
        conds.push({ CODE: codeNum });
        conds.push({ ORD: codeNum });
        conds.push({ ORDNO: codeNum });
        conds.push({ SCODE: codeNum });
    }
    return conds;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const action = searchParams.get("action");
        const restriction = await getMrTerritoryRestriction();

        // Action 1: Preview next voucher number for Return series
        if (action === "nextNumber") {
            const nextVcn = await peekNextVoucherNumber("RETURN");
            return NextResponse.json({ success: true, nextVcn });
        }

        // Action 1b: Executive Return Metrics Summary
        if (action === "metrics") {
            const [totalAgg, todayAgg] = await Promise.all([
                SalesMdis.aggregate([
                    { $match: combineFilters({
                        $and: [
                            { $or: [{ TYPE: "SR" }, { INVTYPE: "R" }, { VCN: /^RET/i }] },
                            ...(restriction.isMrRestricted
                                ? [{ CODEP: { $in: restriction.allowedOrdnos?.length ? restriction.allowedOrdnos : ["NONE_MATCH"] } }]
                                : [])
                        ]
                    }, companyVfpMatch) },
                    { $group: { _id: null, totalAmount: { $sum: "$FINAL" }, count: { $sum: 1 } } }
                ]),
                SalesMdis.aggregate([
                    { $match: combineFilters({
                        $and: [
                            { $or: [{ TYPE: "SR" }, { INVTYPE: "R" }, { VCN: /^RET/i }] },
                            { DATE: todayStr() },
                            ...(restriction.isMrRestricted
                                ? [{ CODEP: { $in: restriction.allowedOrdnos?.length ? restriction.allowedOrdnos : ["NONE_MATCH"] } }]
                                : [])
                        ]
                    }, companyVfpMatch) },
                    { $group: { _id: null, totalAmount: { $sum: "$FINAL" }, count: { $sum: 1 } } }
                ])
            ]);

            return NextResponse.json({
                success: true,
                totalReturnsAmount: totalAgg[0]?.totalAmount || 0,
                totalReturnsCount: totalAgg[0]?.count || 0,
                todayReturnsAmount: todayAgg[0]?.totalAmount || 0,
                todayReturnsCount: todayAgg[0]?.count || 0,
            });
        }

        // Action 2: Get Customer's Sale Invoices & Line Items for return selection
        if (action === "customerInvoices") {
            const partyCode = (searchParams.get("partyCode") || "").trim();
            if (!partyCode) {
                return NextResponse.json({ success: false, error: "partyCode is required" }, { status: 400 });
            }

            const partyConds = buildPartyConds(partyCode);

            const party = await Customer.findOne(combineFilters({ $or: partyConds }, companyVfpMatch)).lean();
            if (restriction.isMrRestricted && (!party || !restriction.isPartyAllowed(party))) {
                return NextResponse.json({ success: false, error: "Party is outside your assigned hierarchy" }, { status: 403 });
            }

            // Find all Sale Invoices for this customer (excluding returns)
            const invoiceHeaders = await SalesMdis.find(
                combineFilters(
                    {
                        $or: partyConds,
                        TYPE: { $ne: "SR" },
                        INVTYPE: { $ne: "R" },
                    },
                    companyVfpMatch
                ),
                { VCN: 1, VOUCHER: 1, BILLNO: 1, DATE: 1, FINAL: 1, AMOUNTT: 1, TAXAMO: 1, REMARKS: 1 }
            )
                .sort({ DATE: -1, createdAt: -1 })
                .limit(50)
                .lean();

            const vcns: any[] = [];
            invoiceHeaders.forEach((h: any) => {
                const addVcn = (v: any) => {
                    if (!v) return;
                    const str = String(v).trim();
                    if (str) vcns.push(str);
                    const num = Number(str);
                    if (!isNaN(num)) vcns.push(num);
                };
                addVcn(h.VCN);
                addVcn(h.VOUCHER);
                addVcn(h.BILLNO);
            });

            // Fetch Line Items from SalesDis with all possible matching voucher keys
            const lineItems = vcns.length > 0
                ? await SalesDis.find({
                    $or: [
                        { VCN: { $in: vcns } },
                        { VOUCHER: { $in: vcns } },
                        { BILLNO: { $in: vcns } },
                    ],
                }).lean()
                : [];

            // Collect product codes & batch lookup
            const productCodes = lineItems.map((i: any) => i.CODE).filter(Boolean);
            const productBatches = productCodes.length > 0
                ? await ProductBatch.find({
                    $or: [
                        { CODE: { $in: productCodes } },
                        { CODEP: { $in: productCodes } }
                    ]
                }).lean()
                : [];

            const batchMap = new Map<string, any>();
            productBatches.forEach((b: any) => {
                const bCode = String(b.CODE || b.CODEP || "").trim();
                const bNo = String(b.BATCHNO || b.BATCH || "").trim().toUpperCase();
                if (bCode && bNo) {
                    batchMap.set(`${bCode}_${bNo}`, b);
                }
            });

            const itemsByVcn = new Map<string, any[]>();
            lineItems.forEach((item: any) => {
                const v = String(item.VCN || item.VOUCHER || item.BILLNO || "").trim();
                if (!v) return;

                const rawBatch = String(item.BATCH || item.BATCHNO || item.BATCH_NO || item.BNO || "").trim();
                const prodCode = item.CODE || item.CODEP || 0;
                const batchKey = `${prodCode}_${rawBatch.toUpperCase()}`;
                const pb = batchMap.get(batchKey);

                const batchNo = rawBatch || pb?.BATCHNO || pb?.BATCH || "N/A";
                const exp = String(item.EXP || item.EXPDATE || item.EXPIRY || pb?.EXP || "").trim();
                const qty = Number(item.QTY || item.QUANTITY || 1);
                const rate = Number(item.RATE || item.PRATE || item.MRP || 0);
                const taxP = Number(item.TAX || item.TAXP || item.GST || 12);
                const disP = Number(item.DISCOUNT || item.DISP || item.DISC || 0);

                const gross = qty * rate;
                const disAmt = (gross * disP) / 100;
                const taxable = gross - disAmt;
                const taxAmt = (taxable * taxP) / 100;
                const total = Number(item.TOTAL || item.AMMMOUNT || item.AMOUNT || Math.round(taxable + taxAmt));

                if (!itemsByVcn.has(v)) itemsByVcn.set(v, []);
                itemsByVcn.get(v)!.push({
                    code: prodCode,
                    product: item.PRODUCT || item.NAME || "Product",
                    batchNo,
                    exp,
                    qty,
                    rate,
                    taxP,
                    disP,
                    total,
                });
            });

            const invoices = invoiceHeaders.map((h: any) => {
                const vcnStr = String(h.VCN || h.VOUCHER || h.BILLNO || "").trim();
                const itemsList = itemsByVcn.get(vcnStr) || [];
                return {
                    vcn: vcnStr,
                    date: h.DATE || "N/A",
                    finalAmount: Number(h.FINAL || h.AMOUNTT || 0),
                    itemsCount: itemsList.length,
                    items: itemsList,
                };
            });

            return NextResponse.json({ success: true, invoices });
        }

        const search = (searchParams.get("q") || searchParams.get("search") || "").trim();
        const partyCode = (searchParams.get("partyCode") || "").trim();
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "50", 10)));

        // Build filter for Sales Returns (INVTYPE: "R" or TYPE: "SR" or VCN starts with RET/SR)
        const filter: any = combineFilters(
            {
                $or: [
                    { TYPE: "SR" },
                    { INVTYPE: "R" },
                    { VCN: { $regex: "^(RET|SR|CN)-", $options: "i" } },
                ],
            },
            companyVfpMatch
        );

        if (restriction.isMrRestricted) {
            filter.CODEP = { $in: restriction.allowedOrdnos?.length ? restriction.allowedOrdnos : ["NONE_MATCH"] };
        }

        if (partyCode) {
            const partyConds = buildPartyConds(partyCode);
            filter.$and = filter.$and || [];
            filter.$and.push({ $or: partyConds });
        }

        if (startDate || endDate) {
            filter.DATE = {};
            if (startDate) filter.DATE.$gte = startDate;
            if (endDate) filter.DATE.$lte = endDate;
        }

        if (search) {
            const searchRegex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
            const searchConds: any[] = [
                { VCN: searchRegex },
                { VOUCHER: searchRegex },
                { BILLNO: searchRegex },
                { CODEP: searchRegex },
                { CODE: searchRegex },
                { COMPANY: searchRegex },
                { REMARKS: searchRegex },
                { REASON: searchRegex },
            ];
            filter.$and = filter.$and || [];
            filter.$and.push({ $or: searchConds });
        }

        // Fetch Customer details map
        const customerOrders = await Order.find({ SALDR: "Y" }, { ORDNO: 1, CODEP: 1, PARNAM: 1, CITY: 1 }).lean();
        const partyMap = new Map<string, { name: string; city: string }>();
        customerOrders.forEach((o: any) => {
            if (o.ORDNO) {
                partyMap.set(String(o.ORDNO).trim(), {
                    name: String(o.PARNAM || o.ORDNO).trim(),
                    city: String(o.CITY || "").trim(),
                });
            }
            if (o.CODEP) {
                partyMap.set(String(o.CODEP).trim(), {
                    name: String(o.PARNAM || o.CODEP).trim(),
                    city: String(o.CITY || "").trim(),
                });
            }
        });

        const [totalCount, docs] = await Promise.all([
            SalesMdis.countDocuments(filter),
            SalesMdis.find(filter)
                .sort({ DATE: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ]);

        const items = docs.map((d: any) => {
            const code = String(d.CODEP || d.CODE || "").trim();
            const pInfo = partyMap.get(code);
            return {
                id: d._id.toString(),
                vcn: d.VCN || d.VOUCHER || "N/A",
                date: d.DATE || "N/A",
                partyCode: code,
                partyName: pInfo ? pInfo.name : code || "N/A",
                city: pInfo ? pInfo.city : "",
                amount: Number(d.FINAL || d.AMOUNTT || 0),
                taxAmount: Number(d.TAXAMO || 0),
                remarks: d.REMARKS || d.REASON || "",
                status: d.STATUS || "Posted",
            };
        });

        return NextResponse.json({
            success: true,
            items,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
            },
        });
    } catch (error: any) {
        console.error("Sales Return GET Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();

        const {
            partyCode,
            date = todayStr(),
            originalVcn = "",
            items = [],
            remarks = "",
            reason = "Sales Return",
            restockToInventory = true,
            companyId = "",
            companyCode = "",
            fyId = "",
            fyCode = "",
        } = body;

        if (!partyCode) {
            return NextResponse.json(
                { success: false, error: "Customer / Party is required" },
                { status: 400 }
            );
        }

        const restriction = await getMrTerritoryRestriction();
        if (restriction.isMrRestricted) {
            const partyConds = buildPartyConds(String(partyCode).trim());
            const party = await Customer.findOne({ $or: partyConds }).lean();
            if (!party || !restriction.isPartyAllowed(party)) {
                return NextResponse.json({ success: false, error: "Party is outside your assigned hierarchy" }, { status: 403 });
            }
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, error: "At least one return item is required" },
                { status: 400 }
            );
        }

        // Generate next VCN from Series Master for RETURN type
        const vcn = await consumeNextVoucherNumber("RETURN");

        // Calculate totals
        let totalTaxable = 0;
        let totalTax = 0;
        let totalFinal = 0;

        const disDocs: any[] = [];

        for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx];
            const qty = Math.max(1, Number(item.qty || 1));
            const rate = Number(item.rate || 0);
            const taxP = Number(item.taxP || 0);
            const disP = Number(item.disP || 0);

            const gross = qty * rate;
            const disAmt = (gross * disP) / 100;
            const taxable = gross - disAmt;
            const taxAmt = (taxable * taxP) / 100;
            const lineTotal = Math.round(taxable + taxAmt);

            totalTaxable += taxable;
            totalTax += taxAmt;
            totalFinal += lineTotal;

            const itemUniqueKey = `DIS_${vcn}_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const codeVal = item.code ? (isNaN(Number(item.code)) ? item.code : Number(item.code)) : 0;

            disDocs.push({
                VCN: vcn,
                DATE: date,
                CODE: codeVal,
                CODEP: codeVal,
                PRODUCT: item.product || "Unknown Product",
                BATCHNO: item.batchNo || "N/A",
                EXP: item.exp || null,
                QTY: qty,
                RATE: rate,
                TAX: taxP,
                TAXAMO: taxAmt,
                DISCOUNT: disP,
                TOTAL: lineTotal,
                _vfpTable: "DIS",
                _vfpSourceKey: itemUniqueKey,
            });

            // Restock through the central stock ledger so Sale Return is always
            // reflected in company + financial-year stock and in Stock Ledger.
            if (restockToInventory && item.code) {
                const currentUser: any = await getCurrentUser();
                if (!companyId || !fyId) {
                    return NextResponse.json({ success: false, error: "Company and Financial Year are required for stock return" }, { status: 400 });
                }
                await applyStockMovement({
                    companyId: String(companyId),
                    companyCode: String(companyCode || ""),
                    fyId: String(fyId),
                    fyCode: String(fyCode || ""),
                    productId: String(item.productId || ""),
                    productCode: String(item.code),
                    productName: String(item.product || ""),
                    batchNo: String(item.batchNo || ""),
                    expiry: String(item.exp || ""),
                    quantity: qty,
                    type: "SALE_RETURN",
                    referenceType: "SALES_RETURN",
                    referenceNo: String(vcn),
                    referenceKey: `SALES_RETURN:${vcn}:${idx}`,
                    rate,
                    mrp: Number(item.mrp || 0),
                    remarks: `Sales Return ${vcn}`,
                    createdBy: String(currentUser?._id || ""),
                });
            }
        }

        const roundedFinal = Math.round(totalFinal);
        const headerUniqueKey = `MDIS_${vcn}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        // 1. Create Header Record in SalesMdis
        const returnHeader = await SalesMdis.create({
            VCN: vcn,
            VOUCHER: vcn,
            DATE: date,
            TYPE: "SR",
            INVTYPE: "R",
            CODEP: partyCode,
            CODE: partyCode,
            AMOUNTT: totalTaxable,
            TAXAMO: totalTax,
            FINAL: roundedFinal,
            REMARKS: remarks || reason,
            REASON: reason,
            ORIGINAL_VCN: originalVcn,
            STATUS: "Posted",
            _vfpTable: "MDIS",
            _vfpSourceKey: headerUniqueKey,
        });

        // 2. Insert Item Details in SalesDis
        if (disDocs.length > 0) {
            await SalesDis.insertMany(disDocs);
        }

        const glUniqueKey = `GL_${vcn}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        // 3. Post Credit Note Entry into GLedger (Credit Customer account by roundedFinal)
        await GLedger.create({
            CODE: partyCode,
            CODEP: partyCode,
            DATE: date,
            VOUCHER: vcn,
            VCN: vcn,
            BOOK: "SR",
            TYPE: "CR",
            CREDIT: roundedFinal,
            DEBIT: 0,
            REMARK1: `Sales Return ${vcn} ${remarks ? `(${remarks})` : ""}`,
            REMARK: remarks || reason || `Sales Return ${vcn}`,
            _vfpTable: "GLEDGER",
            _vfpSourceKey: glUniqueKey,
        });

        // 4. Decrement Customer & Order balances in Master
        const partyConds = buildPartyConds(partyCode);
        await Promise.all([
            Customer.updateOne(
                { $or: partyConds },
                { $inc: { BALANCE: -roundedFinal, CREDIT: roundedFinal } }
            ).catch(() => {}),
            Order.updateOne(
                { $or: partyConds },
                { $inc: { BALANCE: -roundedFinal, CREDIT: roundedFinal } }
            ).catch(() => {})
        ]);

        // 5. Update Pendings / Outstanding
        let originalInvoiceAdjusted = false;
        if (originalVcn) {
            const res = await Pendings.updateOne(
                {
                    $and: [
                        { $or: partyConds },
                        {
                            $or: [
                                { VCN: originalVcn },
                                { VOUCHER: originalVcn },
                                { BILLNO: originalVcn },
                            ],
                        },
                        { BALANCE: { $gt: 0 } },
                    ],
                },
                { $inc: { BALANCE: -roundedFinal } }
            ).catch(() => null);

            if (res && res.matchedCount > 0) {
                originalInvoiceAdjusted = true;
            }
        }

        // If specific original invoice was not updated in Pendings, create credit note record in Pendings
        if (!originalInvoiceAdjusted) {
            const pendUniqueKey = `PEND_${vcn}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            await Pendings.create({
                ACGROUP: "C",
                CODEP: partyCode,
                CODE: partyCode,
                VCN: vcn,
                VOUCHER: vcn,
                DATE: date,
                INVTYPE: "R",
                BALANCE: -roundedFinal, // Negative balance represents credit note adjustment
                FINAL: roundedFinal,
                _vfpTable: "PEND",
                _vfpSourceKey: pendUniqueKey,
            });
        }

        return NextResponse.json({
            success: true,
            message: `Sales Return voucher ${vcn} saved successfully!`,
            vcn,
            data: returnHeader,
        });

    } catch (error: any) {
        console.error("Sales Return POST Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to create sales return" },
            { status: 500 }
        );
    }
}

