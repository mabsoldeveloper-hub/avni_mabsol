import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { SalesDis, SalesMdis, Product, GLedger } from "@/models/dashboardModels";
import Company from "@/models/Company";
import FinancialYear from "@/models/FinancialYear";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { buildFYDateQuery } from "@/lib/financialYearHelper";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";
import Customer from "@/models/Customer";
import { stateFromGstno, stateFromCity } from "@/lib/indiaMapStateResolver";

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─────────────────────────────────────────────────────────────────────────────
// Color palette — one per FY slot (max 6 FYs)
// ─────────────────────────────────────────────────────────────────────────────
const FY_COLORS = ["#3B82F6", "#22C55E", "#F59E0B", "#A855F7", "#EF4444", "#06B6D4"];

// Indian FY month order: Apr=1 … Mar=12
const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

function calendarMonthToFYIndex(calMonth: number): number {
    // calMonth: 1-12 (Jan=1)
    // FY index:  Apr=0, May=1, ..., Mar=11
    return calMonth >= 4 ? calMonth - 4 : calMonth + 8;
}

function fyIndexLabel(idx: number): string {
    return MONTH_LABELS[idx] ?? `M${idx + 1}`;
}

function fyQuarterLabel(calMonth: number): string {
    if ([4, 5, 6].includes(calMonth)) return "Q1 (Apr-Jun)";
    if ([7, 8, 9].includes(calMonth)) return "Q2 (Jul-Sep)";
    if ([10, 11, 12].includes(calMonth)) return "Q3 (Oct-Dec)";
    return "Q4 (Jan-Mar)";
}

// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);

        // ── Filter-options mode: returns distinct State/Area/Route/DSM/ASM/RSM values with counts ──
        if (searchParams.get("mode") === "filter-options") {
            const companyVfpMatch = await getCompanyVfpFilter(searchParams);
            const restriction = await getMrTerritoryRestriction();

            const baseMatch: any = combineFilters(
                companyVfpMatch,
                restriction.isMrRestricted && restriction.allowedCompanyCodes?.length
                    ? { COMPANY: { $in: [...restriction.allowedCompanyCodes] } }
                    : {}
            );

            const [
                allCustomers,
                mdisAreas, disAreas,
                mdisRoutes, disRoutes,
                mdisDsms, disDsms,
                mdisAsms, disAsms,
                mdisRsms, disRsms,
            ] = await Promise.all([
                Customer.find({}, { ORDNO: 1, PARNAM: 1, CITY: 1, AREA: 1, ROUT: 1, DSM: 1, ASM: 1, RSM: 1, STATE: 1, GSTNO: 1 }).lean().catch(() => []),
                SalesMdis.distinct("AREA", combineFilters(baseMatch, { AREA: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesDis.distinct("AREA", combineFilters(baseMatch, { AREA: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesMdis.distinct("ROUT", combineFilters(baseMatch, { ROUT: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesDis.distinct("ROUT", combineFilters(baseMatch, { ROUT: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesMdis.distinct("DSM", combineFilters(baseMatch, { DSM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesDis.distinct("DSM", combineFilters(baseMatch, { DSM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesMdis.distinct("ASM", combineFilters(baseMatch, { ASM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesDis.distinct("ASM", combineFilters(baseMatch, { ASM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesMdis.distinct("RSM", combineFilters(baseMatch, { RSM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesDis.distinct("RSM", combineFilters(baseMatch, { RSM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
            ]);

            const isValid = (v: string) => {
                if (!v) return false;
                const lower = v.toLowerCase();
                return (
                    lower !== "null" &&
                    lower !== "undefined" &&
                    lower !== "n/a" &&
                    lower !== "none" &&
                    v !== "-"
                );
            };

            const stateMap = new Map<string, number>();
            const areaMap = new Map<string, number>();
            const routeMap = new Map<string, number>();
            const dsmMap = new Map<string, number>();
            const asmMap = new Map<string, number>();
            const rsmMap = new Map<string, number>();

            (allCustomers as any[]).forEach((c: any) => {
                const city = c.CITY ? String(c.CITY).trim() : "";
                const explicitArea = c.AREA ? String(c.AREA).trim() : "";
                const state = (c.STATE ? String(c.STATE).trim() : null) || stateFromGstno(c.GSTNO) || stateFromCity(city);
                const route = c.ROUT ? String(c.ROUT).trim() : "";
                const dsm = c.DSM ? String(c.DSM).trim() : "";
                const asm = c.ASM ? String(c.ASM).trim() : "";
                const rsm = c.RSM ? String(c.RSM).trim() : "";

                if (state && isValid(state)) {
                    stateMap.set(state, (stateMap.get(state) || 0) + 1);
                }
                const areaKey = explicitArea || city;
                if (areaKey && isValid(areaKey)) {
                    areaMap.set(areaKey, (areaMap.get(areaKey) || 0) + 1);
                }
                if (route && isValid(route)) {
                    routeMap.set(route, (routeMap.get(route) || 0) + 1);
                }
                if (dsm && isValid(dsm)) {
                    dsmMap.set(dsm, (dsmMap.get(dsm) || 0) + 1);
                }
                if (asm && isValid(asm)) {
                    asmMap.set(asm, (asmMap.get(asm) || 0) + 1);
                }
                if (rsm && isValid(rsm)) {
                    rsmMap.set(rsm, (rsmMap.get(rsm) || 0) + 1);
                }
            });

            const addFromList = (list: any[], map: Map<string, number>) => {
                (list || []).forEach((item: any) => {
                    const str = String(item || "").trim();
                    if (str && isValid(str) && !map.has(str)) {
                        map.set(str, 1);
                    }
                });
            };

            addFromList(mdisAreas, areaMap);
            addFromList(disAreas, areaMap);
            addFromList(mdisRoutes, routeMap);
            addFromList(disRoutes, routeMap);
            addFromList(mdisDsms, dsmMap);
            addFromList(disDsms, dsmMap);
            addFromList(mdisAsms, asmMap);
            addFromList(disAsms, asmMap);
            addFromList(mdisRsms, rsmMap);
            addFromList(disRsms, rsmMap);

            const toSortedCountList = (map: Map<string, number>) => {
                return Array.from(map.entries())
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
            };

            return NextResponse.json({
                success: true,
                states: toSortedCountList(stateMap),
                areas: toSortedCountList(areaMap),
                routes: toSortedCountList(routeMap),
                dsms: toSortedCountList(dsmMap),
                asms: toSortedCountList(asmMap),
                rsms: toSortedCountList(rsmMap),
            });
        }

        // ── Parse requested FY IDs (comma-separated) ──────────────────────────
        const fyIdsParam = searchParams.get("fyIds") || "";
        const fyIds = fyIdsParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        if (fyIds.length === 0) {
            return NextResponse.json(
                { success: false, error: "At least one fyId is required. Pass ?fyIds=id1,id2" },
                { status: 400 }
            );
        }

        // ── Fetch all requested FinancialYear docs ────────────────────────────
        const fyDocs = await FinancialYear.find({ _id: { $in: fyIds } }).lean();

        if (fyDocs.length === 0) {
            return NextResponse.json(
                { success: false, error: "No valid Financial Years found for the given fyIds" },
                { status: 404 }
            );
        }

        // ── Common: company VFP filter + MR territory restriction ─────────────
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const restriction = await getMrTerritoryRestriction();

        // Territory filters
        const stateFilter = (searchParams.get("state") || "").trim();
        const areaFilter  = (searchParams.get("area")  || "").trim();
        const routeFilter = (searchParams.get("route") || "").trim();
        const dsmFilter   = (searchParams.get("dsm")   || "").trim();
        const asmFilter   = (searchParams.get("asm")   || "").trim();
        const rsmFilter   = (searchParams.get("rsm")   || "").trim();

        const hasTerritoryFilter = Boolean(stateFilter || areaFilter || routeFilter || dsmFilter || asmFilter || rsmFilter);

        let territoryCodeps: string[] | null = null;
        let territoryVouchers: number[] | null = null;

        if (hasTerritoryFilter) {
            const allCustomers = await Customer.find(
                {},
                { ORDNO: 1, PARNAM: 1, CITY: 1, AREA: 1, ROUT: 1, DSM: 1, ASM: 1, RSM: 1, STATE: 1, GSTNO: 1 }
            ).lean();

            const codepSet = new Set<string>();

            (allCustomers as any[]).forEach((c: any) => {
                const city = (c.CITY || "").toString().trim();
                const explicitArea = (c.AREA || "").toString().trim();
                const state = (c.STATE || "").toString().trim() || stateFromGstno(c.GSTNO) || stateFromCity(city) || "";
                const route = (c.ROUT || "").toString().trim();
                const dsm = (c.DSM || "").toString().trim();
                const asm = (c.ASM || "").toString().trim();
                const rsm = (c.RSM || "").toString().trim();

                if (stateFilter && !state.toLowerCase().includes(stateFilter.toLowerCase())) return;
                if (areaFilter && !city.toLowerCase().includes(areaFilter.toLowerCase()) && !explicitArea.toLowerCase().includes(areaFilter.toLowerCase())) return;
                if (routeFilter && !route.toLowerCase().includes(routeFilter.toLowerCase())) return;
                if (dsmFilter && !dsm.toLowerCase().includes(dsmFilter.toLowerCase())) return;
                if (asmFilter && !asm.toLowerCase().includes(asmFilter.toLowerCase())) return;
                if (rsmFilter && !rsm.toLowerCase().includes(rsmFilter.toLowerCase())) return;

                if (c.ORDNO) codepSet.add(String(c.ORDNO).trim());
            });

            // Check if there are direct field matches on SalesDis
            const disGeoMatch: any = {};
            if (areaFilter)  disGeoMatch.AREA = { $regex: escapeRegex(areaFilter),  $options: "i" };
            if (routeFilter) disGeoMatch.ROUT = { $regex: escapeRegex(routeFilter), $options: "i" };
            if (dsmFilter)   disGeoMatch.DSM  = { $regex: escapeRegex(dsmFilter),   $options: "i" };
            if (asmFilter)   disGeoMatch.ASM  = { $regex: escapeRegex(asmFilter),   $options: "i" };
            if (rsmFilter)   disGeoMatch.RSM  = { $regex: escapeRegex(rsmFilter),   $options: "i" };

            const matchedDisVouchers = Object.keys(disGeoMatch).length
                ? await SalesDis.distinct("VOUCHER", disGeoMatch).catch(() => [])
                : [];

            territoryCodeps = Array.from(codepSet);
            territoryVouchers = (matchedDisVouchers as number[]).filter(
                (v) => v !== null && v !== undefined
            );
        }

        // Build territory conditions for MDIS / DIS / GLedger
        const buildMdisTerritoryMatch = () => {
            if (!hasTerritoryFilter) return {};
            const directGeo: any = {};
            if (areaFilter)  directGeo.AREA = { $regex: escapeRegex(areaFilter),  $options: "i" };
            if (routeFilter) directGeo.ROUT = { $regex: escapeRegex(routeFilter), $options: "i" };
            if (dsmFilter)   directGeo.DSM  = { $regex: escapeRegex(dsmFilter),   $options: "i" };
            if (asmFilter)   directGeo.ASM  = { $regex: escapeRegex(asmFilter),   $options: "i" };
            if (rsmFilter)   directGeo.RSM  = { $regex: escapeRegex(rsmFilter),   $options: "i" };

            const conditions: any[] = [];
            if (Object.keys(directGeo).length > 0) conditions.push(directGeo);
            if (territoryCodeps && territoryCodeps.length > 0) {
                conditions.push({ CODEP: { $in: territoryCodeps } });
            }
            if (territoryVouchers && territoryVouchers.length > 0) {
                conditions.push({ VOUCHER: { $in: territoryVouchers } });
            }

            if (conditions.length === 0) {
                return { CODEP: "NO_TERRITORY_MATCH" };
            }

            return conditions.length === 1 ? conditions[0] : { $or: conditions };
        };

        const mdisTerritoryMatch = buildMdisTerritoryMatch();

        const mrMdisFilter: any = combineFilters(
            mdisTerritoryMatch,
            restriction.isMrRestricted
                ? restriction.allowedCompanyCodes?.length
                    ? { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                    : restriction.allowedOrdnos?.length
                    ? { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                    : { CODEP: "NONE_MATCH" }
                : {}
        );

        const mrDisFilter: any = mrMdisFilter;

        const gledgerTerritoryMatch = () => {
            if (!hasTerritoryFilter) return {};
            const directGeo: any = {};
            if (areaFilter)  directGeo.AREA = { $regex: escapeRegex(areaFilter),  $options: "i" };
            if (routeFilter) directGeo.ROUT = { $regex: escapeRegex(routeFilter), $options: "i" };
            if (dsmFilter)   directGeo.DSM  = { $regex: escapeRegex(dsmFilter),   $options: "i" };
            if (asmFilter)   directGeo.ASM  = { $regex: escapeRegex(asmFilter),   $options: "i" };
            if (rsmFilter)   directGeo.RSM  = { $regex: escapeRegex(rsmFilter),   $options: "i" };

            const orConds: any[] = [];
            if (Object.keys(directGeo).length > 0) orConds.push(directGeo);
            if (territoryCodeps && territoryCodeps.length > 0) {
                orConds.push({ CODE: { $in: territoryCodeps } });
                orConds.push({ CODE1: { $in: territoryCodeps } });
            }

            if (orConds.length === 0) return { CODE: "NO_TERRITORY_MATCH" };
            return orConds.length === 1 ? orConds[0] : { $or: orConds };
        };

        const mrGledgerFilter: any = combineFilters(
            gledgerTerritoryMatch(),
            restriction.isMrRestricted
                ? restriction.allowedOrdnos?.length
                    ? { CODE: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                    : { CODE: "NONE_MATCH" }
                : {}
        );

        // ── Company name map (for resolving COMPANY code → readable name) ─────
        const companyDocs = await Company.find(
            {},
            { GCODE: { $toString: "$GCODE" }, GNAME: 1, CCODE: 1, CNAME: 1 }
        ).lean();
        const companyNameMap = new Map<string, string>();
        companyDocs.forEach((c: any) => {
            const name = String(c.CNAME || c.GNAME || "").trim();
            [c.GCODE, c.CCODE].forEach((k) => {
                if (k) {
                    const key = String(k).trim().toUpperCase();
                    if (key && !companyNameMap.has(key)) companyNameMap.set(key, name);
                }
            });
        });

        // ─────────────────────────────────────────────────────────────────────
        // Process each FY
        // ─────────────────────────────────────────────────────────────────────
        const fyDataResults = await Promise.all(
            fyDocs.map(async (fyDoc: any, fyIdx: number) => {
                const startDate = new Date(fyDoc.startDate).toISOString().slice(0, 10);
                const endDate = new Date(fyDoc.endDate).toISOString().slice(0, 10);
                const color = FY_COLORS[fyIdx % FY_COLORS.length];

                // Dynamically build per-FY VFP filter for this specific financial year
                const perFyParams = new URLSearchParams(searchParams);
                perFyParams.delete("fyIds");
                if (fyDoc._id) perFyParams.set("fyId", String(fyDoc._id));
                const perFyCompanyMatch = await getCompanyVfpFilter(perFyParams);

                const dateQueryMDIS = buildFYDateQuery("DATE", startDate, endDate);
                const dateQueryDIS = buildFYDateQuery("DATE", startDate, endDate);
                const dateQueryGLedger = buildFYDateQuery("DATE", startDate, endDate);

                // ── 1. SalesMdis: Sales / Purchase / Returns ─────────────────
                const mdisMatch = combineFilters(perFyCompanyMatch, mrMdisFilter, dateQueryMDIS, {
                    TYPE: { $in: ["S", "P", "R"] },
                });
                const mdisDocs = await SalesMdis.find(mdisMatch).lean();

                // Monthly breakdown init (12 slots: Apr=0 … Mar=11)
                const monthlyMap: Record<
                    number,
                    { monthLabel: string; monthIndex: number; sales: number; purchase: number; returns: number; collections: number; payments: number }
                > = {};
                for (let i = 0; i < 12; i++) {
                    monthlyMap[i] = { monthLabel: fyIndexLabel(i), monthIndex: i, sales: 0, purchase: 0, returns: 0, collections: 0, payments: 0 };
                }

                // Quarterly breakdown
                const quarterMap: Record<string, { quarter: string; sales: number; purchase: number; collections: number; returns: number }> = {
                    "Q1 (Apr-Jun)": { quarter: "Q1 (Apr-Jun)", sales: 0, purchase: 0, collections: 0, returns: 0 },
                    "Q2 (Jul-Sep)": { quarter: "Q2 (Jul-Sep)", sales: 0, purchase: 0, collections: 0, returns: 0 },
                    "Q3 (Oct-Dec)": { quarter: "Q3 (Oct-Dec)", sales: 0, purchase: 0, collections: 0, returns: 0 },
                    "Q4 (Jan-Mar)": { quarter: "Q4 (Jan-Mar)", sales: 0, purchase: 0, collections: 0, returns: 0 },
                };

                let totalSales = 0;
                let totalPurchases = 0;
                let salesReturns = 0;

                mdisDocs.forEach((doc: any) => {
                    if (!doc.DATE) return;
                    const d = new Date(doc.DATE);
                    const calMonth = d.getMonth() + 1;
                    const fyIdx = calendarMonthToFYIndex(calMonth);
                    const qLabel = fyQuarterLabel(calMonth);
                    const amt = Number(doc.FINAL || 0);

                    if (doc.TYPE === "S") {
                        totalSales += amt;
                        if (monthlyMap[fyIdx]) monthlyMap[fyIdx].sales += amt;
                        if (quarterMap[qLabel]) quarterMap[qLabel].sales += amt;
                    } else if (doc.TYPE === "P") {
                        totalPurchases += amt;
                        if (monthlyMap[fyIdx]) monthlyMap[fyIdx].purchase += amt;
                        if (quarterMap[qLabel]) quarterMap[qLabel].purchase += amt;
                    } else if (doc.TYPE === "R") {
                        salesReturns += amt;
                        if (monthlyMap[fyIdx]) monthlyMap[fyIdx].returns += amt;
                        if (quarterMap[qLabel]) quarterMap[qLabel].returns += amt;
                    }
                });

                const netSales = totalSales - salesReturns;

                // ── 2. GLedger: Collections & Payments ───────────────────────
                const gledgerMatch = combineFilters(perFyCompanyMatch, mrGledgerFilter, dateQueryGLedger, {
                    BOOK: { $in: ["R", "P"] },
                });
                const gledgerDocs = await GLedger.find(gledgerMatch).lean();

                let totalCollections = 0;
                let totalPayments = 0;

                gledgerDocs.forEach((doc: any) => {
                    if (!doc.DATE) return;
                    const d = new Date(doc.DATE);
                    const calMonth = d.getMonth() + 1;
                    const fyIdx = calendarMonthToFYIndex(calMonth);
                    const qLabel = fyQuarterLabel(calMonth);

                    if (doc.BOOK === "R" && doc.CD === "C") {
                        const cr = Number(doc.CREDIT || 0);
                        totalCollections += cr;
                        if (monthlyMap[fyIdx]) monthlyMap[fyIdx].collections += cr;
                        if (quarterMap[qLabel]) quarterMap[qLabel].collections += cr;
                    }
                    if (doc.BOOK === "P" && doc.CD === "D") {
                        const dr = Number(doc.DEBIT || 0);
                        totalPayments += dr;
                        if (monthlyMap[fyIdx]) monthlyMap[fyIdx].payments += dr;
                    }
                });

                // ── 3. SalesDis: Product + Company breakdown ──────────────────
                const disMatch = combineFilters(perFyCompanyMatch, mrDisFilter, dateQueryDIS);
                const disDocs = await SalesDis.find(disMatch).lean();

                const productMapAgg = new Map<number, { code: number; qty: number; amount: number }>();
                const companyMapAgg = new Map<string, { company: string; qty: number; amount: number }>();

                disDocs.forEach((doc: any) => {
                    const amt = Number(doc.AMMMOUNT || doc.AMOUNT || 0);
                    const qty = Number(doc.QTY || 0);

                    const code = Number(doc.CODE || 0);
                    if (code) {
                        if (!productMapAgg.has(code)) productMapAgg.set(code, { code, qty: 0, amount: 0 });
                        const p = productMapAgg.get(code)!;
                        p.qty += qty;
                        p.amount += amt;
                    }

                    const compCode = String(doc.COMPANY || "Unknown").trim().toUpperCase();
                    if (compCode) {
                        const resolvedName = companyNameMap.get(compCode) || compCode;
                        if (!companyMapAgg.has(resolvedName)) companyMapAgg.set(resolvedName, { company: resolvedName, qty: 0, amount: 0 });
                        const c = companyMapAgg.get(resolvedName)!;
                        c.qty += qty;
                        c.amount += amt;
                    }
                });

                // Top 10 products
                const sortedProducts = Array.from(productMapAgg.values())
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 10);

                const productCodes = sortedProducts.map((p) => p.code);
                const productDetails = await Product.find({ CODE: { $in: productCodes } })
                    .select({ CODE: 1, PRODUCT: 1 })
                    .lean();
                const productNameMap = new Map(productDetails.map((p: any) => [p.CODE, p.PRODUCT]));

                const topProducts = sortedProducts.map((p) => ({
                    code: p.code,
                    productName: productNameMap.get(p.code) || `Product #${p.code}`,
                    qty: p.qty,
                    amount: p.amount,
                }));

                const companyBreakdown = Array.from(companyMapAgg.values())
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 10);

                return {
                    fyId: String(fyDoc._id),
                    fyName: fyDoc.fyName,
                    fyCode: fyDoc.fyCode || "",
                    startDate,
                    endDate,
                    color,
                    summary: {
                        totalSales,
                        netSales,
                        salesReturns,
                        totalPurchases,
                        totalCollections,
                        totalPayments,
                        returnsRatioPercent: totalSales > 0 ? Number(((salesReturns / totalSales) * 100).toFixed(2)) : 0,
                        collectionEfficiencyPercent: totalSales > 0 ? Number(((totalCollections / totalSales) * 100).toFixed(2)) : 0,
                    },
                    monthlyBreakdown: Object.values(monthlyMap),
                    quarterlyBreakdown: Object.values(quarterMap),
                    topProducts,
                    companyBreakdown,
                };
            })
        );

        // Sort by startDate ascending
        fyDataResults.sort((a, b) => a.startDate.localeCompare(b.startDate));

        return NextResponse.json({ success: true, fyData: fyDataResults });
    } catch (err: any) {
        console.error("FY-wise compare API error:", err);
        return NextResponse.json(
            { success: false, error: err?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}
