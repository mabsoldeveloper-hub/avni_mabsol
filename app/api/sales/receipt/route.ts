import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import GLedger from "@/models/GLedger";
import Pendings from "@/models/Pendings";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import SalesMdis from "@/models/SalesMdis";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { consumeNextVoucherNumber, peekNextVoucherNumber } from "@/lib/voucherSeriesHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

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
        const partyCode = (searchParams.get("partyCode") || searchParams.get("customer") || "").trim();

        // Action 1: Preview next voucher number for RECEIPT series
        if (action === "nextNumber") {
            const nextVcn = await peekNextVoucherNumber("RECEIPT");
            return NextResponse.json({ success: true, nextVcn });
        }

        // Action 1b: Executive Collection Metrics (Total Outstanding, Today's Receipts)
        if (action === "metrics") {
            const [pendingAgg, todayAgg] = await Promise.all([
                Pendings.aggregate([
                    { $match: combineFilters({ BALANCE: { $gt: 0 } }, companyVfpMatch) },
                    { $group: { _id: null, totalOutstanding: { $sum: "$BALANCE" }, count: { $sum: 1 } } }
                ]),
                GLedger.aggregate([
                    {
                        $match: combineFilters({
                        $and: [
                            { $or: [
                                { BOOK: "R" }, { TYPE: "CR" }, { TYPE: "RC" },
                                { VOUCHER: /^RCT/i }, { VCN: /^RCT/i }
                            ] },
                            { CREDIT: { $gt: 0 } },
                            { DATE: todayStr() },
                            ...(restriction.isMrRestricted ? [{ CODE: { $in: restriction.allowedOrdnos?.length ? restriction.allowedOrdnos : ["NONE_MATCH"] } }] : [])
                        ]
                    }, companyVfpMatch)
                    },
                    { $group: { _id: null, totalCollected: { $sum: "$CREDIT" }, count: { $sum: 1 } } }
                ])
            ]);

            return NextResponse.json({
                success: true,
                totalPendingOutstanding: pendingAgg[0]?.totalOutstanding || 0,
                pendingCount: pendingAgg[0]?.count || 0,
                todayReceiptsAmount: todayAgg[0]?.totalCollected || 0,
                todayReceiptsCount: todayAgg[0]?.count || 0,
            });
        }

        // Action 1c: Customer Financial Profile & Balance Summary
        if (action === "customerDetails" && partyCode) {
            const partyConds = buildPartyConds(partyCode);
            const party = await Customer.findOne(combineFilters({ $or: partyConds }, companyVfpMatch)).lean();
            if (restriction.isMrRestricted && (!party || !restriction.isPartyAllowed(party))) {
                return NextResponse.json({ success: false, error: "Party is outside your assigned hierarchy" }, { status: 403 });
            }

            const [orderCust, mainCust, pendingsAgg, glAgg, salesAgg] = await Promise.all([
                Order.findOne(combineFilters({ $or: partyConds }, companyVfpMatch)).lean(),
                Customer.findOne(combineFilters({ $or: partyConds }, companyVfpMatch)).lean(),
                Pendings.aggregate([
                    { $match: combineFilters({ $or: partyConds, BALANCE: { $gt: 0 } }, companyVfpMatch) },
                    { $group: { _id: null, totalPending: { $sum: "$BALANCE" }, count: { $sum: 1 } } }
                ]),
                GLedger.aggregate([
                    { $match: combineFilters({ $or: partyConds }, companyVfpMatch) },
                    { $group: { _id: null, totalDebit: { $sum: "$DEBIT" }, totalCredit: { $sum: "$CREDIT" } } }
                ]),
                SalesMdis.aggregate([
                    { $match: combineFilters({ $or: partyConds, TYPE: { $ne: "SR" }, INVTYPE: { $ne: "R" } }, companyVfpMatch) },
                    { $group: { _id: null, totalSales: { $sum: "$FINAL" }, count: { $sum: 1 } } }
                ])
            ]);

            const cust = orderCust || mainCust;
            const totalDebit = glAgg[0]?.totalDebit || salesAgg[0]?.totalSales || 0;
            const totalCredit = glAgg[0]?.totalCredit || 0;
            const netBalance = totalDebit - totalCredit;
            const totalPending = pendingsAgg[0]?.totalPending || (netBalance > 0 ? netBalance : salesAgg[0]?.totalSales || 0);
            const pendingInvoicesCount = pendingsAgg[0]?.count || salesAgg[0]?.count || 0;

            return NextResponse.json({
                success: true,
                customer: {
                    code: partyCode,
                    name: cust?.PARNAM || cust?.NAME || partyCode,
                    city: cust?.CITY || "",
                    phone: cust?.PHONE || cust?.MOBILE || "",
                    gstin: cust?.GSTIN || cust?.GST || cust?.GSTNO || "",
                    netBalance,
                    totalPending,
                    pendingInvoicesCount,
                }
            });
        }

        // Action 2: Get Pending Outstanding Invoices for a selected customer
        if (action === "pendingInvoices" && partyCode) {
            const partyConds = buildPartyConds(partyCode);
            const party = await Customer.findOne(combineFilters({ $or: partyConds }, companyVfpMatch)).lean();
            if (restriction.isMrRestricted && (!party || !restriction.isPartyAllowed(party))) {
                return NextResponse.json({ success: false, error: "Party is outside your assigned hierarchy" }, { status: 403 });
            }

            let pendingDocs = await Pendings.find(
                combineFilters({ $or: partyConds, BALANCE: { $gt: 0 } }, companyVfpMatch),
                { VCN: 1, VOUCHER: 1, BILLNO: 1, DATE: 1, BALANCE: 1, FINAL: 1, DDATE: 1 }
            )
                .sort({ DATE: 1 })
                .lean();

            // Fallback: If no Pendings documents found, search SalesMdis for past sale invoices
            if (pendingDocs.length === 0) {
                const salesDocs = await SalesMdis.find(
                    combineFilters({
                        $or: partyConds,
                        TYPE: { $ne: "SR" },
                        INVTYPE: { $ne: "R" },
                    }, companyVfpMatch),
                    { VCN: 1, VOUCHER: 1, BILLNO: 1, DATE: 1, FINAL: 1, AMOUNTT: 1 }
                )
                    .sort({ DATE: -1 })
                    .limit(50)
                    .lean();

                pendingDocs = salesDocs.map((s: any) => ({
                    _id: s._id,
                    VCN: s.VCN || s.VOUCHER || s.BILLNO || "N/A",
                    DATE: s.DATE || "N/A",
                    DDATE: s.DATE || "N/A",
                    FINAL: Number(s.FINAL || s.AMOUNTT || 0),
                    BALANCE: Number(s.FINAL || s.AMOUNTT || 0),
                }));
            }

            const items = pendingDocs.map((p: any) => ({
                id: p._id.toString(),
                vcn: p.VCN || p.VOUCHER || p.BILLNO || "N/A",
                date: p.DATE || "N/A",
                dueDate: p.DDATE || p.DATE || "N/A",
                originalAmount: Number(p.FINAL || p.BALANCE || 0),
                pendingAmount: Number(p.BALANCE || 0),
            }));

            return NextResponse.json({ success: true, items });
        }

        // Action 3: List Receipt Vouchers History
        const search = (searchParams.get("q") || searchParams.get("search") || "").trim();
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "50", 10)));

        // Build filter for Receipts (BOOK: "R" or TYPE: "CR" or VCN starts with RCT)
        let filter: any = combineFilters({
            $or: [
                { BOOK: "R" },
                { TYPE: "CR" },
                { TYPE: "RC" },
                { VOUCHER: /^RCT/i },
                { VCN: /^RCT/i },
            ],
            CREDIT: { $gt: 0 },
        }, companyVfpMatch);

        if (restriction.isMrRestricted) {
            filter.CODE = { $in: restriction.allowedOrdnos?.length ? restriction.allowedOrdnos : ["NONE_MATCH"] };
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
                { VOUCHER: searchRegex },
                { VCN: searchRegex },
                { REMARK1: searchRegex },
                { REMARK: searchRegex },
                { CODE: searchRegex },
                { CODEP: searchRegex },
                { REFNO: searchRegex },
                { BANK: searchRegex },
            ];
            filter.$and = filter.$and || [];
            filter.$and.push({ $or: searchConds });
        }

        // Fetch Customer details map
        const customerOrders = await Order.find(
            restriction.isMrRestricted
                ? { SALDR: "Y", $or: [
                    { ORDNO: { $in: restriction.allowedOrdnos?.length ? restriction.allowedOrdnos : ["NONE_MATCH"] } },
                    { CODEP: { $in: restriction.allowedOrdnos?.length ? restriction.allowedOrdnos : ["NONE_MATCH"] } },
                ] }
                : { SALDR: "Y" },
            { ORDNO: 1, CODEP: 1, PARNAM: 1, CITY: 1 }
        ).lean();
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
            GLedger.countDocuments(filter),
            GLedger.find(filter)
                .sort({ DATE: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ]);

        const items = docs.map((d: any) => {
            const code = String(d.CODE || d.CODEP || "").trim();
            const pInfo = partyMap.get(code);
            return {
                id: d._id.toString(),
                vcn: d.VOUCHER || d.VCN || "N/A",
                date: d.DATE || "N/A",
                partyCode: code,
                partyName: pInfo ? pInfo.name : code || "N/A",
                city: pInfo ? pInfo.city : "",
                amount: Number(d.CREDIT || 0),
                paymentMode: d.MODE || d.TYPE || "Cash/Bank",
                refNo: d.REFNO || d.CHEQUENO || "",
                remarks: d.REMARK1 || d.REMARK || "",
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
        console.error("Receipt GET Error:", error);
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
            receiptAmount = 0,
            paymentMode = "Bank Transfer",
            refNo = "",
            bankName = "",
            discountAllowed = 0,
            remarks = "",
            adjustedInvoices = [], // [{ id, vcn: "INV-00101", originalAmount: 5000, settledAmount: 5000 }]
        } = body;

        const amount = Number(receiptAmount || 0);
        const discount = Number(discountAllowed || 0);

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

        if (amount <= 0) {
            return NextResponse.json(
                { success: false, error: "Receipt Amount must be greater than zero" },
                { status: 400 }
            );
        }

        // Generate next VCN from Series Master for RECEIPT type
        const vcn = await consumeNextVoucherNumber("RECEIPT");

        const uniqueKey = `RCT_${vcn}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        // 1. Post Credit Entry for Customer in GLedger
        const ledgerEntry = await GLedger.create({
            CODE: partyCode,
            CODEP: partyCode,
            DATE: date,
            VOUCHER: vcn,
            VCN: vcn,
            BOOK: "R",
            TYPE: "CR",
            CREDIT: amount,
            DEBIT: 0,
            MODE: paymentMode,
            REFNO: refNo,
            BANK: bankName,
            DISCOUNT: discount,
            REMARK1: `Payment Receipt ${vcn} - ${paymentMode}${refNo ? ` Ref: ${refNo}` : ""}${discount > 0 ? ` Disc: ₹${discount}` : ""}${remarks ? ` (${remarks})` : ""}`,
            REMARK: remarks || `Receipt Voucher ${vcn}`,
            _vfpTable: "GLEDGER",
            _vfpSourceKey: uniqueKey,
        });

        // 2. Decrement Customer & Order balances in Master
        const partyConds = buildPartyConds(partyCode);
        await Promise.all([
            Customer.updateOne(
                { $or: partyConds },
                { $inc: { BALANCE: -amount, CREDIT: amount } }
            ).catch(() => {}),
            Order.updateOne(
                { $or: partyConds },
                { $inc: { BALANCE: -amount, CREDIT: amount } }
            ).catch(() => {})
        ]);

        // 3. Adjust Pending Invoices balances in Pendings
        if (adjustedInvoices && Array.isArray(adjustedInvoices) && adjustedInvoices.length > 0) {
            for (const inv of adjustedInvoices) {
                const settled = Number(inv.settledAmount || 0);
                if (settled <= 0) continue;

                let updated = false;

                // A) Try updating exact document by _id if valid Mongo ObjectId
                if (inv.id && mongoose.Types.ObjectId.isValid(inv.id)) {
                    const res = await Pendings.updateOne(
                        { _id: inv.id },
                        { $inc: { BALANCE: -settled } }
                    );
                    if (res.matchedCount > 0) updated = true;
                }

                // B) Try updating by partyConds & VCN / VOUCHER / BILLNO
                if (!updated && inv.vcn) {
                    const res = await Pendings.updateOne(
                        {
                            $and: [
                                { $or: partyConds },
                                {
                                    $or: [
                                        { VCN: inv.vcn },
                                        { VOUCHER: inv.vcn },
                                        { BILLNO: inv.vcn },
                                    ],
                                },
                            ],
                        },
                        { $inc: { BALANCE: -settled } }
                    );
                    if (res.matchedCount > 0) updated = true;
                }

                // C) Fallback: If no Pendings record existed (e.g. invoice from SalesMdis), create a Pendings record
                if (!updated && inv.vcn) {
                    const origAmt = Number(inv.originalAmount || settled);
                    const remBal = Math.max(0, origAmt - settled);
                    await Pendings.create({
                        CODEP: partyCode,
                        CODE: partyCode,
                        VCN: inv.vcn,
                        VOUCHER: inv.vcn,
                        BILLNO: inv.vcn,
                        DATE: date,
                        DDATE: date,
                        FINAL: origAmt,
                        BALANCE: remBal,
                        ACGROUP: "C",
                        INVTYPE: "I",
                        _vfpSourceKey: `PEND_${inv.vcn}_${Date.now()}`,
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Receipt voucher ${vcn} created successfully!`,
            vcn,
            data: ledgerEntry,
        });

    } catch (error: any) {
        console.error("Receipt POST Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to create receipt voucher" },
            { status: 500 }
        );
    }
}

