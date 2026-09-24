import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesDis from "@/models/SalesDis";
import SubDis from "@/models/SubDis";
import Pend from "@/models/Pend";
import GLedger from "@/models/GLedger";
import Product from "@/models/Product";
import ProBat from "@/models/ProductBatch";
import OrderParty from "@/models/Order";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseReturn from "@/models/PurchaseReturn";
import {
    buildStateResolution,
    resolveState,
    monthFilter,
    STATE_NAME_TO_MAP_ID,
    stateFromGstno,
    stateFromCity,
    extractPincode,
    extractDistrict,
    cleanPartyName,
    isRealParty,
    resolveStateFromText,
} from "@/lib/indiaMapStateResolver";


/**
 * GET /api/dashboard/india-map
 * -----------------------------------------------------------------------------
 * Full rollup using all 8 of your real tables: MDIS, DIS, SUBDIS, PEND,
 * GLEDGER, PRO, PROBAT, ORDER.
 *
 * FIX — Party Directory was empty / junk-filled. Checked
 * mabsol_crm_vfp_new_folder_order.json directly: it has 297 rows.
 *   - If the "order" collection in your MongoDB is empty right now, this
 *     API will correctly return an empty party list — that's a data
 *     problem, not a code problem. Import all 8 provided JSON files into
 *     the exact collection names the models below expect (mdis, dis,
 *     subdis, pend, gledger, pro, probat, order). See the import script
 *     I've provided alongside this fix.
 *   - Independently, isRealParty() is now row-aware (see
 *     lib/indiaMapStateResolver.ts) and cleanPartyName() strips the
 *     VFP fixed-width padding + duplicated city text that was showing up
 *     glued onto PARNAM (e.g. "ALCOLABS                      PANCHKULA"
 *     -> "Alcolabs"), so even once the data is loaded the directory reads
 *     as an actual customer list instead of a mix of real parties and raw
 *     ledger heads.
 *
 * Query params: ?fy=2026-27&month=Jul (optional)
 *   Applied to every table that has its own date field (MDIS, DIS, SUBDIS,
 *   GLEDGER). NOT applied to PEND (outstanding is an as-of balance, not a
 *   period figure) or to stock/expiry/party-directory sections (also
 *   as-of-today snapshots, not period figures).
 * -----------------------------------------------------------------------------
 */

interface StateAccumulator {
    stateId: string;
    stateName: string;
    sales: number;
    salesReturns: number;
    purchase: number;
    customers: Set<string>;
    suppliers: Set<string>;
    outstanding: number;
    collection: number;
    payment: number;
    dispatch: number;
    productQty: Map<string, number>; // productCode -> qty, to derive Top Product
}

const DAY_MS = 24 * 60 * 60 * 1000;

import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import FinancialYear from "@/models/FinancialYear";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const restriction = await getMrTerritoryRestriction();

        const codepFilter = combineFilters(
          companyVfpMatch,
          restriction.isMrRestricted
              ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                  ? { CODEP: { $in: restriction.allowedOrdnos } }
                  : { CODEP: "NONE_MATCH" }
              : {}
        );

        const pendFilter = combineFilters(
          companyVfpMatch,
          restriction.isMrRestricted
              ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                  ? { ORD: { $in: restriction.allowedOrdnos } }
                  : { ORD: "NONE_MATCH" }
              : {}
        );

        const glFilter = combineFilters(
          companyVfpMatch,
          restriction.isMrRestricted
            ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { BOOK: { $in: ["R", "P"] }, CODE: { $in: restriction.allowedOrdnos } }
                : { BOOK: { $in: ["R", "P"] }, CODE: "NONE_MATCH" }
            : { BOOK: { $in: ["R", "P"] } }
        );

        const productFilter = combineFilters(
          companyVfpMatch,
          restriction.isMrRestricted
            ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                ? { GCODE: { $in: restriction.allowedCompanyCodes } }
                : { GCODE: "NONE_MATCH" }
            : {}
        );

        const orderFilter = combineFilters(
          companyVfpMatch,
          restriction.isMrRestricted
            ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { ORDNO: { $in: restriction.allowedOrdnos } }
                : { ORDNO: "NONE_MATCH" }
            : {}
        );

        let fy = searchParams.get("fy");
        const month = searchParams.get("month");
        const fyId = searchParams.get("fyId");

        if (!fy || fy === "null" || fy === "undefined" || fy.toLowerCase().startsWith("all")) {
            fy = "All";
        } else if (fyId && fyId !== "ALL") {
            let currentFY = await FinancialYear.findById(fyId);
            if (currentFY?.fyName) {
                fy = currentFY.fyName;
            }
        }

        const acc = new Map<string, StateAccumulator>();
        const getAcc = (stateName: string): StateAccumulator => {
            if (!acc.has(stateName)) {
                acc.set(stateName, {
                    stateId: STATE_NAME_TO_MAP_ID[stateName] ?? stateName.toLowerCase().slice(0, 2),
                    stateName,
                    sales: 0,
                    salesReturns: 0,
                    purchase: 0,
                    customers: new Set(),
                    suppliers: new Set(),
                    outstanding: 0,
                    collection: 0,
                    payment: 0,
                    dispatch: 0,
                    productQty: new Map(),
                });
            }
            return acc.get(stateName)!;
        };

        // ---- 1. MDIS: resolves state (anchor table) AND supplies Sales /
        //         Purchase / Returns / Provisional in one pass. ----
        const resolution = await buildStateResolution(codepFilter);

        let provisionalCount = 0;
        let provisionalValue = 0;

        resolution.mdisRows.forEach((r: any) => {
            const state = resolveState(resolution, r.CODEP, r.VOUCHER);
            if (!state) return;

            if (r.TYPE === "V") {
                // Provisional / challan-only, not yet a confirmed invoice —
                // tracked nationally, kept out of the Sales figure.
                provisionalCount += 1;
                provisionalValue += r.FINAL || 0;
                return;
            }
            if (!monthFilter(r.DATE, fy, month)) return;

            const a = getAcc(state);
            if (r.TYPE === "S") {
                a.sales += r.FINAL || 0;
                if (r.CODEP) a.customers.add(r.CODEP);
            } else if (r.TYPE === "P") {
                a.purchase += r.FINAL || 0;
                if (r.CODEP) a.suppliers.add(r.CODEP);
            } else if (r.TYPE === "B") {
                a.salesReturns += r.FINAL || 0;
            }
        });

        // ---- 1.1 Web Purchases (PurchaseBill & PurchaseReturn) ----
        try {
            const webBills = await PurchaseBill.find(combineFilters(companyVfpMatch)).lean();
            webBills.forEach((b: any) => {
                if (!monthFilter(b.billDate || b.createdAt, fy, month)) return;
                const st =
                    b.state ||
                    stateFromGstno(b.vendorGst) ||
                    stateFromCity(b.city) ||
                    resolveStateFromText(b.vendorName, b.city, b.state) ||
                    "Haryana";
                const a = getAcc(st);
                a.purchase += Number(b.netAmount || b.grandTotal || 0);
                if (b.vendorName) a.suppliers.add(b.vendorName);
            });

            const webReturns = await PurchaseReturn.find(combineFilters(companyVfpMatch)).lean();
            webReturns.forEach((r: any) => {
                if (!monthFilter(r.returnDate || r.createdAt, fy, month)) return;
                const st =
                    r.state ||
                    stateFromGstno(r.vendorGst) ||
                    stateFromCity(r.city) ||
                    resolveStateFromText(r.vendorName, r.city, r.state) ||
                    "Haryana";
                const a = getAcc(st);
                a.purchase -= Number(r.netAmount || r.grandTotal || 0);
            });
        } catch (e) {
            console.error("Error fetching web purchases in india-map route:", e);
        }

        // ---- 2. DIS: item detail -> Top Product per state. ----
        const disRows = await SalesDis.find(codepFilter, { VOUCHER: 1, CODEP: 1, CODE: 1, QTY: 1, DATE: 1 }).lean();
        disRows.forEach((r: any) => {
            if (!monthFilter(r.DATE, fy, month)) return;
            const state = resolveState(resolution, r.CODEP, r.VOUCHER);
            if (!state) return;
            const a = getAcc(state);
            const key = String(r.CODE);
            a.productQty.set(key, (a.productQty.get(key) || 0) + (r.QTY || 0));
        });

        // ---- 3. SUBDIS: dispatch count per state. ----
        const subdisRows = await SubDis.find(codepFilter, { VOUCHER: 1, CODEP: 1, DATE: 1 }).lean();
        subdisRows.forEach((r: any) => {
            if (!monthFilter(r.DATE, fy, month)) return;
            const state = resolveState(resolution, r.CODEP, r.VOUCHER);
            if (!state) return;
            getAcc(state).dispatch += 1;
        });

        // ---- 4. PEND: outstanding, as-of-today (not date-filtered). ----
        const pendRows = await Pend.find(pendFilter, { VOUCHER: 1, SVOUCHER: 1, ORD: 1, FINAL: 1 }).lean();
        pendRows.forEach((r: any) => {
            const state =
                resolveState(resolution, r.ORD, r.VOUCHER) ??
                (r.SVOUCHER ? resolution.voucherToState.get(r.SVOUCHER) ?? null : null);
            if (!state) return;
            getAcc(state).outstanding += r.FINAL || 0;
        });

        // ---- 5. GLEDGER: Collection (BOOK=R, CREDIT side) and Payment
        //         (BOOK=P, DEBIT side). ----
        const glRows = await GLedger.find(glFilter, { VOUCHER: 1, CODE: 1, BOOK: 1, CREDIT: 1, DEBIT: 1, DATE: 1 }).lean();
        glRows.forEach((r: any) => {
            if (!monthFilter(r.DATE, fy, month)) return;
            const state = resolveState(resolution, r.CODE, r.VOUCHER);
            if (!state) return;
            const a = getAcc(state);
            if (r.BOOK === "R") a.collection += r.CREDIT || 0;
            else if (r.BOOK === "P") a.payment += r.DEBIT || 0;
        });

        // ---- 6. Resolve top-product names from PRO. ----
        const productCodes = new Set<string>();
        acc.forEach((a) => a.productQty.forEach((_qty, code) => productCodes.add(code)));
        const products = await Product.find(
            { CODE: { $in: Array.from(productCodes).map(Number) } },
            { CODE: 1, BILLNAME: 1, PRODUCT: 1 }
        ).lean();
        const productNames = new Map<string, string>();
        products.forEach((p: any) => productNames.set(String(p.CODE), p.BILLNAME || p.PRODUCT || "—"));

        // ---- 7. Stock valuation + low-stock alerts, from PRO (national, no state dimension). ----
        const allProducts = await Product.find(
            productFilter,
            { CODE: 1, BILLNAME: 1, PRODUCT: 1, BALANCE: 1, MRP: 1, LPRATE: 1, MINIMUM: 1, MAXIMUM: 1 }
        ).lean();
        let stockValueAtMRP = 0;
        const lowStockItems: { code: string; name: string; balance: number; minimum: number }[] = [];
        allProducts.forEach((p: any) => {
            stockValueAtMRP += (p.BALANCE || 0) * (p.MRP || 0);
            if ((p.MINIMUM || 0) > 0 && (p.BALANCE || 0) <= (p.MINIMUM || 0)) {
                lowStockItems.push({
                    code: String(p.CODE),
                    name: p.BILLNAME || p.PRODUCT || "—",
                    balance: p.BALANCE || 0,
                    minimum: p.MINIMUM || 0,
                });
            }
        });
        lowStockItems.sort((x, y) => x.balance - y.balance);

        // ---- 8. Batch-wise stock cost value + expiry alerts, from PROBAT. ----
        const probatRows = await ProBat.find(
            combineFilters(companyVfpMatch),
            { CODE: 1, BATCHNO: 1, BILLNAME: 1, EXP: 1, BALANCE: 1, LPRATE: 1 }
        ).lean();
        let stockValueAtCost = 0;
        let expiredCount = 0;
        let expiringSoonCount = 0;
        const now = Date.now();
        const expiryList: { code: string; name: string; batch: string; exp: string; daysLeft: number; balance: number }[] = [];
        probatRows.forEach((r: any) => {
            const balance = r.BALANCE || 0;
            stockValueAtCost += balance * (r.LPRATE || 0);
            if (balance <= 0 || !r.EXP) return;
            const expDate = new Date(r.EXP);
            if (isNaN(expDate.getTime())) return;
            const daysLeft = Math.round((expDate.getTime() - now) / DAY_MS);
            if (daysLeft < 0) expiredCount += 1;
            else if (daysLeft <= 90) expiringSoonCount += 1;
            if (daysLeft <= 90) {
                expiryList.push({
                    code: String(r.CODE),
                    name: r.BILLNAME || "—",
                    batch: r.BATCHNO || "—",
                    exp: r.EXP,
                    daysLeft,
                    balance,
                });
            }
        });
        expiryList.sort((x, y) => x.daysLeft - y.daysLeft);

        // ---- 9. ORDER: Party Directory & Ledger Balances (independent panel — see header note). ----
        // isRealParty() filters out chart-of-accounts heads (tax accounts,
        // stock account, discount heads, expense heads, capital accounts,
        // etc.) that also live in this table — shared with
        // /api/dashboard/india-map/parties so both stay consistent. City /
        // District / Pincode are parsed per-party below; see
        // extractPincode() / extractDistrict() for exactly how. PARNAM is
        // cleaned via cleanPartyName() to strip VFP fixed-width padding and
        // the duplicated trailing city text some rows have.
        const orderRows = await OrderParty.find(
            orderFilter,
            { PARNAM: 1, CITY: 1, GSTNO: 1, BALANCE: 1, SALCR: 1, SALDR: 1, PURCR: 1, PURDR: 1, PARADD: 1, PARADD1: 1, PARADD2: 1, PHONE1: 1, PHONE2: 1, ORDNO: 1, COMPANY: 1, GCODE: 1, SCODE: 1, DSM: 1 }
        ).lean();
        const partyRows = orderRows
            .filter((r: any) => isRealParty(r.PARNAM, r))
            .filter((r: any) => !restriction.isMrRestricted || restriction.isPartyAllowed(r));
        let totalLedgerBalance = 0;
        let partyStateResolved = 0;
        let partiesWithPincode = 0;
        let partiesWithDistrictFromAddress = 0;
        const partyStateCounts = new Map<string, number>();
        const allParties = partyRows.map((r: any) => {
            totalLedgerBalance += r.BALANCE || 0;
            const city = r.CITY ? r.CITY.trim() : null;
            const pincode = extractPincode(r.PARADD, r.PARADD1, r.PARADD2, city);
            const { district, source: districtSource } = extractDistrict(city, r.PARADD, r.PARADD1, r.PARADD2);
            if (pincode) partiesWithPincode += 1;
            if (districtSource === "address") partiesWithDistrictFromAddress += 1;
            const state = stateFromGstno(r.GSTNO) ?? stateFromCity(city);
            if (state) {
                partyStateResolved += 1;
                partyStateCounts.set(state, (partyStateCounts.get(state) || 0) + 1);
            }
            return {
                name: cleanPartyName(r.PARNAM, city),
                city,
                district,
                districtSource,
                pincode,
                phone: r.PHONE1 || r.PHONE2 || null,
                state,
                balance: r.BALANCE || 0,
                isBuyer: r.SALDR === "Y",
                isSupplier: r.PURCR === "Y",
            };
        });
        const topParties = [...allParties].sort((x, y) => Math.abs(y.balance) - Math.abs(x.balance)).slice(0, 10);

        // ---- 10. Build final per-state response. ----
        const result = Array.from(acc.values()).map((a) => {
            let topProductCode = "";
            let topQty = -1;
            a.productQty.forEach((qty, code) => {
                if (qty > topQty) {
                    topQty = qty;
                    topProductCode = code;
                }
            });
            return {
                stateId: a.stateId,
                stateName: a.stateName,
                sales: a.sales,
                salesReturns: a.salesReturns,
                purchase: a.purchase,
                customers: a.customers.size,
                suppliers: a.suppliers.size,
                outstanding: a.outstanding,
                collection: a.collection,
                payment: a.payment,
                dispatch: a.dispatch,
                topProduct: productNames.get(topProductCode) || "—",
            };
        });

        return NextResponse.json({
            states: result,
            stateData: result,
            national: {
                provisionalVouchers: { count: provisionalCount, value: provisionalValue },
                stock: {
                    valueAtMRP: stockValueAtMRP,
                    valueAtCost: stockValueAtCost,
                    lowStockCount: lowStockItems.length,
                    lowStockItems: lowStockItems.slice(0, 10),
                },
                expiry: {
                    expiredCount,
                    expiringSoonCount,
                    upcoming: expiryList.slice(0, 10),
                },
                partyDirectory: {
                    totalParties: partyRows.length,
                    totalLedgerBalance,
                    resolvedByState: partyStateResolved,
                    unresolved: partyRows.length - partyStateResolved,
                    partiesWithPincode,
                    partiesWithDistrictFromAddress,
                    stateBreakdown: Array.from(partyStateCounts.entries()).map(([state, count]) => ({ state, count })),
                    topParties,
                },
            },
            dataNotes: [
                "Purchase and Sales Returns come from MDIS.TYPE (P / B); TYPE=V rows are provisional (challan-raised, not yet invoiced) and are excluded from Sales — see national.provisionalVouchers.",
                "Outstanding (PEND) and stock/expiry/party-directory figures are as-of-today snapshots and are not affected by the fy/month filter.",
                "The Party Directory (from ORDER) cannot be joined to per-state Sales/Outstanding — ORDER uses a different code space than MDIS/DIS/SUBDIS/PEND/GLEDGER in this data export. Its state is derived from GSTNO where present, else a best-effort city lookup.",
                "District and Pincode are not their own VFP columns — none of the 8 tables has one. Both are parsed out of ORDER's free-text address lines (PARADD/PARADD1/PARADD2); District falls back to City when no explicit district text is found (flagged per-party via districtSource). Full searchable directory: /api/dashboard/india-map/parties.",
                "Party names are cleaned of VFP fixed-width padding and any duplicated trailing city text found in PARNAM (e.g. \"ALCOLABS                      PANCHKULA\" -> \"Alcolabs\") — see cleanPartyName() in lib/indiaMapStateResolver.ts.",
            ],
            filters: { fy, month },
        });
    } catch (err) {
        console.error("india-map API error:", err);
        return NextResponse.json({ error: "Failed to load India map data" }, { status: 500 });
    }
}