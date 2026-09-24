import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import OrderParty from "@/models/Order";
import {
    extractPincode,
    extractDistrict,
    stateFromGstno,
    stateFromCity,
    cleanPartyName,
    isRealParty,
    MAP_ID_TO_STATE_NAMES,
} from "@/lib/indiaMapStateResolver";


/**
 * GET /api/dashboard/india-map/parties
 * -----------------------------------------------------------------------------
 * Full, searchable Party Directory built from ORDER — every real party (not
 * just the national rollup's top 10), with City / District / Pincode / GST /
 * Phone / Balance and Buyer-Supplier flags.
 *
 * FIX — Party Directory was empty / junk-filled:
 *   1. If this still comes back empty after deploying this fix, the "order"
 *      collection itself is empty in MongoDB — none of the query logic
 *      below can produce rows that don't exist in the DB. Import the 8
 *      provided VFP JSON exports (see the import script) into the exact
 *      collection names models/IndiaMapModels.ts expects, in particular
 *      "order" for mabsol_crm_vfp_new_folder_order.json.
 *   2. isRealParty() is now row-aware, so accounting/ledger heads that
 *      don't match the old keyword-only filter (RENT, SALARY & WAGES,
 *      CASH, FREIGHT, DEPRECIATION A/C, CAPITAL ACCOUNT, PROFIT & LOSS A/C,
 *      …) are excluded too — verified against your actual export.
 *   3. cleanPartyName() strips VFP fixed-width padding + duplicated
 *      trailing city text that shows up glued onto PARNAM for ~120 of your
 *      rows (e.g. "ALCOLABS                      PANCHKULA" -> "Alcolabs").
 *
 * District & Pincode are NOT their own VFP columns anywhere in your 8 tables
 * — they're parsed out of ORDER's free-text address lines (PARADD / PARADD1
 * / PARADD2). See extractPincode() / extractDistrict() in
 * lib/indiaMapStateResolver.ts for exactly how, and their fallback rules.
 * `districtSource` on every row tells you whether District came straight
 * from the address text ("address") or was guessed from City because no
 * explicit district text was present ("city").
 *
 * Query params (all optional):
 *   q         - free-text search across name / city / district / pincode / GST
 *   state     - map id (e.g. "hr", "mh") OR full state name — filters to it
 *   sort      - "balance" (default, largest absolute balance first) | "name" | "city"
 *   page      - 1-based page number (default 1)
 *   pageSize  - rows per page (default 25, max 200)
 * -----------------------------------------------------------------------------
 */
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const restriction = await getMrTerritoryRestriction();
        const orderFilter = combineFilters(
          companyVfpMatch,
          restriction.isMrRestricted
              ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                  ? { ORDNO: { $in: restriction.allowedOrdnos } }
                  : { ORDNO: "NONE_MATCH" }
              : {}
        );

        const q = (searchParams.get("q") || "").trim().toUpperCase();
        const stateParam = (searchParams.get("state") || "").trim();
        const sort = searchParams.get("sort") || "balance";
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
        const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10) || 25));

        const rows = await OrderParty.find(
            orderFilter,
            {
                PARNAM: 1,
                CITY: 1,
                GSTNO: 1,
                BALANCE: 1,
                SALCR: 1,
                SALDR: 1,
                PURCR: 1,
                PURDR: 1,
                PARADD: 1,
                PARADD1: 1,
                PARADD2: 1,
                PHONE1: 1,
                PHONE2: 1,
                AREA: 1,
                ORDNO: 1,
                COMPANY: 1,
                GCODE: 1,
                SCODE: 1,
                DSM: 1,
            }
        ).lean();

        const stateNameFilter = stateParam ? MAP_ID_TO_STATE_NAMES[stateParam.toLowerCase()] ?? [stateParam] : null;
        const stateFilterSet = stateNameFilter ? new Set(stateNameFilter) : null;

        let parties = rows
            .filter((r: any) => isRealParty(r.PARNAM, r))
            .filter((r: any) => !restriction.isMrRestricted || restriction.isPartyAllowed(r))
            .map((r: any) => {
            const city = r.CITY ? r.CITY.trim() : null;
            const pincode = extractPincode(r.PARADD, r.PARADD1, r.PARADD2, city);
            const { district, source: districtSource } = extractDistrict(city, r.PARADD, r.PARADD1, r.PARADD2);
            const state = stateFromGstno(r.GSTNO) ?? stateFromCity(city);
            return {
                name: cleanPartyName(r.PARNAM, city),
                city,
                district,
                districtSource,
                pincode,
                state,
                gstno: r.GSTNO || null,
                phone: r.PHONE1 || r.PHONE2 || null,
                area: r.AREA || null,
                orderNo: r.ORDNO || null,
                balance: r.BALANCE || 0,
                isBuyer: r.SALDR === "Y",
                isSupplier: r.PURCR === "Y",
            };
        });

        if (stateFilterSet) {
            parties = parties.filter((p) => p.state && stateFilterSet.has(p.state));
        }
        if (q) {
            parties = parties.filter((p) =>
                [p.name, p.city, p.district, p.pincode, p.gstno, p.state]
                    .filter(Boolean)
                    .some((v) => String(v).toUpperCase().includes(q))
            );
        }

        parties.sort((a, b) => {
            if (sort === "name") return a.name.localeCompare(b.name);
            if (sort === "city") return (a.city || "").localeCompare(b.city || "");
            return Math.abs(b.balance) - Math.abs(a.balance);
        });

        const total = parties.length;
        const start = (page - 1) * pageSize;
        const pageRows = parties.slice(start, start + pageSize);

        return NextResponse.json({
            parties: pageRows,
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            filters: { q: q || null, state: stateParam || null, sort },
            note: "District & Pincode are parsed from ORDER's free-text address lines (PARADD/PARADD1/PARADD2), not dedicated VFP columns — treat as best-effort. See districtSource per row (\"address\" = read explicitly, \"city\" = guessed from City). Party names are cleaned of VFP fixed-width padding and any duplicated trailing city text.",
        });
    } catch (err) {
        console.error("india-map/parties API error:", err);
        return NextResponse.json({ error: "Failed to load party directory" }, { status: 500 });
    }
}