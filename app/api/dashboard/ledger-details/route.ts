import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { GLedger, Order } from "@/models/StockModels";
import Customer from "@/models/Customer";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const fyRange = await getFYDateRange(searchParams);
        const type = (searchParams.get("type") || "all").toLowerCase(); // credit, debit, all
        const search = (searchParams.get("q") || searchParams.get("search") || "").trim();
        const party = (searchParams.get("party") || searchParams.get("company") || "").trim();
        const book = (searchParams.get("book") || "").trim();
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const effectiveStart = startDate || fyRange.startDate;
        const effectiveEnd = endDate || fyRange.endDate;
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "50", 10)));
        const sortBy = searchParams.get("sortBy") || "DATE";
        const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

        // 1. Resolve MR Territory restrictions
        const restriction = await getMrTerritoryRestriction();

        // 2. Fetch Customer & Supplier Party Names Map from Order & Customer models
        const [orders, customers] = await Promise.all([
            Order.find({}, { ORDNO: 1, CODEP: 1, SCODE: 1, CODE: 1, PARNAM: 1, NAME: 1, CITY: 1 }).lean(),
            Customer.find({}, { ORDNO: 1, CODEP: 1, SCODE: 1, CODE: 1, PARNAM: 1, NAME: 1, CITY: 1 }).lean(),
        ]);

        const partyMap = new Map<string, { name: string; city: string }>();

        const addParty = (item: any) => {
            const obj = {
                name: String(item.PARNAM || item.NAME || "").trim(),
                city: String(item.CITY || "").trim(),
            };
            [item.ORDNO, item.CODEP, item.SCODE, item.CODE].forEach((k) => {
                if (k) {
                    const key = String(k).trim().toUpperCase();
                    if (key && !partyMap.has(key)) partyMap.set(key, obj);
                }
            });
        };

        orders.forEach(addParty);
        customers.forEach(addParty);

        // 3. Build GLedger Filter
        let ledgerFilter: any = { ...companyVfpMatch };

        if (type === "debit") {
            // Payment Book (Supplier / Party Payments Made) matching Marg ERP
            ledgerFilter.BOOK = "P";
            ledgerFilter.CD = "D";
        } else if (type === "credit") {
            // Receipt Book (Customer Collections / Receipts Received) matching Marg ERP
            ledgerFilter.BOOK = "R";
            ledgerFilter.CD = "C";
        } else {
            ledgerFilter.BOOK = { $in: ["S", "R", "P"] };
        }

        if (party) {
            ledgerFilter.CODE = party;
        }

        if (book) {
            ledgerFilter.BOOK = book;
        }

        if (effectiveStart || effectiveEnd) {
            const dateMatch = buildFYDateQuery("DATE", effectiveStart, effectiveEnd);
            ledgerFilter = combineFilters(ledgerFilter, dateMatch);
        }

        if (search) {
            const searchRegex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
            const isNum = !isNaN(Number(search));
            
            // Match customer codes by search query
            const matchedCodes = Array.from(partyMap.entries())
                .filter(([code, p]) => searchRegex.test(code) || searchRegex.test(p.name) || searchRegex.test(p.city))
                .map(([code]) => code);

            const searchConds: any[] = [
                { REMARK1: searchRegex },
                { BOOK: searchRegex },
                { CODE: { $in: matchedCodes.length > 0 ? matchedCodes : [search] } },
            ];

            if (isNum) {
                searchConds.push({ VOUCHER: Number(search) });
                searchConds.push({ CREDIT: Number(search) });
                searchConds.push({ DEBIT: Number(search) });
            }

            ledgerFilter = combineFilters(ledgerFilter, { $or: searchConds });
        }

        const sortOption: any = {};
        if (sortBy === "CREDIT") sortOption.CREDIT = sortOrder;
        else if (sortBy === "DEBIT") sortOption.DEBIT = sortOrder;
        else if (sortBy === "CODE") sortOption.CODE = sortOrder;
        else sortOption.DATE = sortOrder;

        const [totalCount, ledgerDocs, summaryAgg, distinctCodes] = await Promise.all([
            GLedger.countDocuments(ledgerFilter),
            GLedger.find(ledgerFilter)
                .sort(sortOption)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            GLedger.aggregate([
                { $match: ledgerFilter },
                {
                    $group: {
                        _id: null,
                        totalCredit: { $sum: { $ifNull: ["$CREDIT", 0] } },
                        totalDebit: { $sum: { $ifNull: ["$DEBIT", 0] } },
                    }
                }
            ]),
            GLedger.distinct("CODE", ledgerFilter)
        ]);

        const seenPartyCodes = new Set<string>();
        const partiesList = distinctCodes
            .filter(Boolean)
            .map((cCode: string) => String(cCode).trim())
            .filter((code: string) => {
                if (!code || seenPartyCodes.has(code)) return false;
                seenPartyCodes.add(code);
                return true;
            })
            .map((code: string) => {
                const pInfo = partyMap.get(code);
                return {
                    code,
                    name: pInfo ? pInfo.name : code,
                    city: pInfo ? pInfo.city : "",
                };
            })
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

        const items = ledgerDocs.map((doc: any) => {
            const code = String(doc.CODE || "").trim();
            const pInfo = partyMap.get(code);
            const cr = Number(doc.CREDIT || 0);
            const dr = Number(doc.DEBIT || 0);

            return {
                id: doc._id.toString(),
                code,
                partyName: pInfo ? pInfo.name : code || "N/A",
                city: pInfo ? pInfo.city : "",
                date: doc.DATE || "N/A",
                voucher: doc.VOUCHER || "N/A",
                book: doc.BOOK || "",
                type: doc.TYPE || "",
                debit: dr,
                credit: cr,
                remark: doc.REMARK1 || doc.NARRATION || "",
                txnType: cr > 0 ? "credit" : "debit",
            };
        });

        const totalCreditSum = summaryAgg[0]?.totalCredit ?? 0;
        const totalDebitSum = summaryAgg[0]?.totalDebit ?? 0;

        return NextResponse.json({
            success: true,
            type,
            items,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
            },
            summary: {
                totalCredit: totalCreditSum,
                totalDebit: totalDebitSum,
                netBalance: totalDebitSum - totalCreditSum,
                totalVouchers: totalCount,
            },
            parties: partiesList,
        });

    } catch (error: any) {
        console.error("Ledger Details API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
