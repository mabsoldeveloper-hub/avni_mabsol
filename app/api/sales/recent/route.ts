import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import SalesMdis from "@/models/SalesMdis";
import Customer from "@/models/Customer";
import Order from "@/models/Order";

import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const fyRange = await getFYDateRange(searchParams);
    const { startDate, endDate } = fyRange;

    const dateMatch = buildFYDateQuery("DATE", startDate, endDate);
    const companyVfpMatch = await getCompanyVfpFilter(searchParams);
    const restriction = await getMrTerritoryRestriction();

    const saleFilterBase = { TRANSFER: { $ne: "P" }, TYPE: { $nin: ["PROFORMA", "ESTIMATE", "P"] } };
    let billMatch: any = combineFilters(dateMatch, saleFilterBase, companyVfpMatch);
    if (restriction.isMrRestricted) {
      const orConditions: any[] = [];
      if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
        orConditions.push({ CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } });
      }
      if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
        orConditions.push({ COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } });
      }
      if (orConditions.length > 0) {
        billMatch = combineFilters(dateMatch, saleFilterBase, companyVfpMatch, { $or: orConditions });
      } else {
        billMatch = combineFilters(dateMatch, saleFilterBase, companyVfpMatch, { CODEP: "NONE_MATCH" });
      }
    }

    const projection = {
      VCN: 1,
      VOUCHER: 1,
      DATE: 1,
      FINAL: 1,
      AMOUNTT: 1,
      CODEP: 1,
      MACHINEBY: 1,
      TYPE: 1,
    };

    let bills: any[] = [];
    try {
      bills = await SalesMdis.find(billMatch, projection)
        .sort({ DATE: -1, _id: -1 })
        .limit(30)
        .lean();
    } catch {
      bills = [];
    }

    // If hierarchy restriction is active, NEVER fall back to an unrestricted
    // company-only query. That could expose another user's invoices.
    if (!bills || bills.length === 0) {
      try {
        const fallbackFilter = restriction.isMrRestricted
          ? billMatch
          : combineFilters(saleFilterBase, companyVfpMatch);

        bills = await SalesMdis.find(fallbackFilter, projection)
          .sort({ _id: -1 })
          .limit(30)
          .lean();
      } catch {
        bills = [];
      }
    }

    let customers: any[] = [];
    let orders: any[] = [];
    try {
      [customers, orders] = await Promise.all([
        Customer.find(combineFilters(companyVfpMatch), { ORDNO: 1, CODEP: 1, PARNAM: 1, NAME: 1, CITY: 1 }).lean(),
        Order.find(combineFilters(companyVfpMatch), { ORDNO: 1, CODEP: 1, PARNAM: 1, NAME: 1, CITY: 1 }).lean(),
      ]);
    } catch {
      customers = [];
      orders = [];
    }

    const customerMap = new Map<string, any>();
    const addCust = (c: any) => {
      const obj = { name: c.PARNAM || c.NAME || "", city: c.CITY || "" };
      [c.ORDNO, c.CODEP, c.SCODE, c.CODE].forEach((k) => {
        if (k) {
          const key = String(k).trim().toUpperCase();
          if (key && !customerMap.has(key)) {
            customerMap.set(key, obj);
          }
        }
      });
    };

    customers.forEach(addCust);
    orders.forEach(addCust);

    const result = bills.map((b: any) => {
      const codeKey = String(b.CODEP || "").trim().toUpperCase();
      const party = customerMap.get(codeKey);

      let dateStr = "";
      if (b.DATE) {
        dateStr = typeof b.DATE === "string" ? b.DATE.slice(0, 10) : new Date(b.DATE).toISOString().slice(0, 10);
      }

      const vcnVal = String(b.VCN || b.VOUCHER || "").trim();
      const voucherVal = String(b.VOUCHER || b.VCN || vcnVal || "BILL").trim();

      return {
        ...b,
        VOUCHER: voucherVal,
        VCN: vcnVal || voucherVal,
        DATE: dateStr,
        customer: party?.name || b.CODEP || "Walk-in Customer",
        city: party?.city || "",
        MACHINEBY: b.MACHINEBY || "Admin",
        FINAL: Number(b.FINAL || b.AMOUNTT || 0),
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Recent bills API error:", err);
    return NextResponse.json([]);
  }
}


