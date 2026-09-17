import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import GLedger from "@/models/GLedger";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import Pendings from "@/models/Pendings";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const fyRange = await getFYDateRange(searchParams);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const search = (searchParams.get("q") || searchParams.get("search") || "").trim();
        const partyCode = searchParams.get("partyCode") || "";
        const area = searchParams.get("area") || "";
        const route = searchParams.get("route") || "";
        const company = searchParams.get("company") || "";
        const division = searchParams.get("division") || "";
        const salesman = searchParams.get("salesman") || "";
        const paymentMode = searchParams.get("paymentMode") || "";
        const discountFilter = searchParams.get("discountFilter") || ""; // "withDiscount" | "noDiscount"
        const minAmount = searchParams.get("minAmount") ? parseFloat(searchParams.get("minAmount")!) : null;
        const maxAmount = searchParams.get("maxAmount") ? parseFloat(searchParams.get("maxAmount")!) : null;

        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "50", 10)));

        const restriction = await getMrTerritoryRestriction();

        // 1. Fetch only party masters allowed by the current hierarchy.
        // Admin can see the full company scope; restricted users can only
        // receive parties belonging to their recursive downline.
        const allowedOrdnos = (restriction.allowedOrdnos || [])
            .map((v: any) => String(v).trim())
            .filter(Boolean);

        const partyAccessFilter: any = restriction.isMrRestricted
            ? allowedOrdnos.length > 0
                ? { $or: [
                    { ORDNO: { $in: allowedOrdnos } },
                    { CODEP: { $in: allowedOrdnos } },
                    { SCODE: { $in: allowedOrdnos } },
                ] }
                : { _id: null }
            : {};

        const [orders, mainCustomers] = await Promise.all([
            Order.find(combineFilters(companyVfpMatch, partyAccessFilter), { ORDNO: 1, CODEP: 1, SCODE: 1, PARNAM: 1, NAME: 1, CITY: 1, AREA: 1, ROUT: 1, ROUTE: 1, COMPANY: 1, DIVISION: 1, DSM: 1, SALESMAN: 1, PHONE: 1, MOBILE: 1, GSTIN: 1, GST: 1, BALANCE: 1 }).lean(),
            Customer.find(combineFilters(companyVfpMatch, partyAccessFilter), { ORDNO: 1, CODEP: 1, SCODE: 1, PARNAM: 1, NAME: 1, CITY: 1, AREA: 1, ROUT: 1, ROUTE: 1, COMPANY: 1, DIVISION: 1, DSM: 1, SALESMAN: 1, PHONE: 1, MOBILE: 1, GSTIN: 1, GST: 1, GSTNO: 1, BALANCE: 1 }).lean(),
        ]);

        const partyMap = new Map<string, any>();
        const addParty = (item: any) => {
            const partyObj = {
                name: item.PARNAM || item.NAME || "",
                city: item.CITY || "",
                area: item.AREA || "",
                route: item.ROUT || item.ROUTE || "",
                company: item.COMPANY || "",
                division: item.DIVISION || "",
                salesman: item.DSM || item.SALESMAN || "",
                phone: item.PHONE || item.MOBILE || "",
                gst: item.GSTIN || item.GST || item.GSTNO || "",
                balance: item.BALANCE || 0,
            };
            [item.ORDNO, item.CODEP, item.SCODE].forEach((k) => {
                if (k) {
                    const key = String(k).trim().toUpperCase();
                    if (key && !partyMap.has(key)) partyMap.set(key, partyObj);
                }
            });
        };

        orders.forEach(addParty);
        mainCustomers.forEach(addParty);

        // Collect distinct filter options
        const areaSet = new Set<string>();
        const routeSet = new Set<string>();
        const companySet = new Set<string>();
        const divisionSet = new Set<string>();
        const salesmanSet = new Set<string>();

        partyMap.forEach((val) => {
            if (val.area) areaSet.add(val.area);
            if (val.route) routeSet.add(val.route);
            if (val.company) companySet.add(val.company);
            if (val.division) divisionSet.add(val.division);
            if (val.salesman) salesmanSet.add(val.salesman);
        });

        // 2. Build filter for Receipt Vouchers (GLedger)
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
            // Fail closed when the user has no assigned parties.
            filter = combineFilters(filter, {
                CODE: { $in: allowedOrdnos.length > 0 ? allowedOrdnos : ["__NO_HIERARCHY_ACCESS__"] }
            });
        }

        const effStart = startDate || fyRange.startDate;
        const effEnd = endDate || fyRange.endDate;

        if (!fyRange.isAll && (effStart || effEnd)) {
            const dateQuery = buildFYDateQuery("DATE", effStart, effEnd);
            filter = combineFilters(filter, dateQuery);
        }

        if (paymentMode) {
            filter = combineFilters(filter, {
                $or: [
                    { MODE: paymentMode },
                    { TYPE: paymentMode },
                ],
            });
        }

        if (discountFilter === "withDiscount") {
            filter = combineFilters(filter, { DISCOUNT: { $gt: 0 } });
        } else if (discountFilter === "noDiscount") {
            filter = combineFilters(filter, {
                $or: [{ DISCOUNT: { $exists: false } }, { DISCOUNT: 0 }, { DISCOUNT: null }],
            });
        }

        if (minAmount !== null || maxAmount !== null) {
            const amtFilter: any = {};
            if (minAmount !== null) amtFilter.$gte = minAmount;
            if (maxAmount !== null) amtFilter.$lte = maxAmount;
            filter = combineFilters(filter, { CREDIT: amtFilter });
        }

        if (partyCode) {
            const isNum = !isNaN(Number(partyCode));
            const pConds: any[] = [{ CODE: partyCode }, { CODEP: partyCode }];
            if (isNum) {
                pConds.push({ CODE: Number(partyCode) });
                pConds.push({ CODEP: Number(partyCode) });
            }
            filter = combineFilters(filter, { $or: pConds });
        }

        if (search) {
            const searchRegex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
            filter = combineFilters(filter, {
                $or: [
                    { VOUCHER: searchRegex },
                    { VCN: searchRegex },
                    { REFNO: searchRegex },
                    { CHEQUENO: searchRegex },
                    { BANK: searchRegex },
                    { REMARK1: searchRegex },
                    { REMARK: searchRegex },
                    { CODE: searchRegex },
                    { CODEP: searchRegex },
                ],
            });
        }

        // Apply Area / Route / Company / Division / Salesman filters
        if (area || route || company || division || salesman) {
            const matchedCodes: string[] = [];
            partyMap.forEach((info, code) => {
                if (area && info.area.toLowerCase() !== area.toLowerCase()) return;
                if (route && info.route.toLowerCase() !== route.toLowerCase()) return;
                if (company && info.company.toLowerCase() !== company.toLowerCase()) return;
                if (division && info.division.toLowerCase() !== division.toLowerCase()) return;
                if (salesman && info.salesman.toLowerCase() !== salesman.toLowerCase()) return;
                matchedCodes.push(code);
            });

            filter = combineFilters(filter, {
                $or: [
                    { CODE: { $in: matchedCodes } },
                    { CODEP: { $in: matchedCodes } },
                ],
            });
        }

        // 3. Aggregate metrics & Fetch records
        const [allDocs, totalCount, docs] = await Promise.all([
            GLedger.find(filter, { CREDIT: 1, DISCOUNT: 1, MODE: 1 }).lean(),
            GLedger.countDocuments(filter),
            GLedger.find(filter)
                .sort({ DATE: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ]);

        let totalCollectedAmount = 0;
        let totalDiscountAllowed = 0;
        let cashCount = 0;
        let bankCount = 0;
        let upiCount = 0;
        let chequeCount = 0;

        allDocs.forEach((d: any) => {
            const amt = Number(d.CREDIT || 0);
            const disc = Number(d.DISCOUNT || 0);
            totalCollectedAmount += amt;
            totalDiscountAllowed += disc;

            const mode = String(d.MODE || d.TYPE || "").toLowerCase();
            if (mode.includes("cash")) cashCount++;
            else if (mode.includes("upi") || mode.includes("qr")) upiCount++;
            else if (mode.includes("cheque") || mode.includes("dd")) chequeCount++;
            else bankCount++;
        });

        const totalSettlementPool = totalCollectedAmount + totalDiscountAllowed;
        const avgReceiptAmount = totalCount > 0 ? Math.round(totalCollectedAmount / totalCount) : 0;

        // Fetch settled invoices breakdown for current page records from Pendings
        const pagePartyCodes = Array.from(new Set(docs.map((d: any) => String(d.CODE || d.CODEP || "").trim()).filter(Boolean)));

        const pendingRecords = pagePartyCodes.length > 0
            ? await Pendings.find(
                { $or: [{ CODEP: { $in: pagePartyCodes } }, { CODE: { $in: pagePartyCodes } }] },
                { VCN: 1, VOUCHER: 1, BILLNO: 1, DATE: 1, BALANCE: 1, FINAL: 1, CODEP: 1, CODE: 1 }
            ).lean()
            : [];

        const pendingsByParty = new Map<string, any[]>();
        pendingRecords.forEach((p: any) => {
            const code = String(p.CODEP || p.CODE || "").trim();
            if (!code) return;
            if (!pendingsByParty.has(code)) pendingsByParty.set(code, []);
            pendingsByParty.get(code)!.push({
                vcn: p.VCN || p.VOUCHER || p.BILLNO || "N/A",
                date: p.DATE || "N/A",
                originalAmount: Number(p.FINAL || 0),
                pendingAmount: Number(p.BALANCE || 0),
            });
        });

        const rows = docs.map((d: any) => {
            const pCode = String(d.CODE || d.CODEP || "").trim();
            const pInfo = partyMap.get(pCode) || {
                name: pCode || "N/A",
                city: "",
                area: "",
                route: "",
                company: "",
                division: "",
                salesman: "",
                phone: "",
                gstin: "",
                balance: 0,
            };

            const partyPendings = pendingsByParty.get(pCode) || [];

            return {
                id: d._id.toString(),
                vcn: d.VOUCHER || d.VCN || "N/A",
                date: d.DATE || "N/A",
                partyCode: pCode,
                partyName: pInfo.name,
                city: pInfo.city,
                area: pInfo.area,
                route: pInfo.route,
                company: pInfo.company,
                division: pInfo.division,
                salesman: pInfo.salesman,
                phone: pInfo.phone,
                gstin: pInfo.gstin,
                partyBalance: pInfo.balance,
                amount: Number(d.CREDIT || 0),
                discount: Number(d.DISCOUNT || 0),
                totalSettlement: Number(d.CREDIT || 0) + Number(d.DISCOUNT || 0),
                paymentMode: d.MODE || d.TYPE || "Bank Transfer",
                refNo: d.REFNO || d.CHEQUENO || "—",
                bankName: d.BANK || "—",
                remarks: d.REMARK1 || d.REMARK || "",
                settledInvoices: partyPendings.slice(0, 5),
            };
        });

        return NextResponse.json({
            success: true,
            summary: {
                totalCount,
                totalCollectedAmount,
                totalDiscountAllowed,
                totalSettlementPool,
                avgReceiptAmount,
                cashCount,
                bankCount,
                upiCount,
                chequeCount,
            },
            filterOptions: {
                areas: Array.from(areaSet).sort(),
                routes: Array.from(routeSet).sort(),
                companies: Array.from(companySet).sort(),
                divisions: Array.from(divisionSet).sort(),
                salesmen: Array.from(salesmanSet).sort(),
                paymentModes: ["Bank Transfer", "Cash", "UPI", "Cheque"],
            },
            rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
            },
        });

    } catch (error: any) {
        console.error("Sales Receipt Report API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch sales receipt report" },
            { status: 500 }
        );
    }
}
