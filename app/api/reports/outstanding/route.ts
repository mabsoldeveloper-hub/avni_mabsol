import { NextRequest, NextResponse } from "next/server";

import OutstandingReport from "@/models/OutstandingReport";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import FinancialYear from "@/models/FinancialYear";
import { getFYDateRange } from "@/lib/financialYearHelper";
import { getCompanyVfpFilter } from "@/lib/companyVfpHelper";
import connectDB from "@/lib/mongodb";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const companyId = searchParams.get("companyId") || "";

        const pageParam = Number(searchParams.get("page") || 1);
        const limitParam = Number(searchParams.get("limit") || 500);

        const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
        const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(2000, Math.floor(limitParam)) : 500;

        const restriction = await getMrTerritoryRestriction();

        const fetchLimit = restriction.isMrRestricted ? 5000 : limit;

        let dueFrom = searchParams.get("dueFrom") || "";
        let dueTo = searchParams.get("dueTo") || "";

        if (!dueFrom || !dueTo) {
            const fyRange = await getFYDateRange(searchParams);
            if (!dueFrom && fyRange.startDate) dueFrom = fyRange.startDate;
            if (!dueTo && fyRange.endDate) dueTo = fyRange.endDate;
        }

        const filter = {
            search: searchParams.get("search") || "",
            customerCode: searchParams.get("customerCode") || "",
            city: searchParams.get("city") || "",
            status: searchParams.get("status") || "",

            area: searchParams.get("area") || "",
            route: searchParams.get("route") || "",
            dsm: searchParams.get("dsm") || "",
            asm: searchParams.get("asm") || "",
            rsm: searchParams.get("rsm") || "",

            type: searchParams.get("type") || "",
            mr: searchParams.get("mr") || "",
            voucher: searchParams.get("voucher") || "",
            vcn: searchParams.get("vcn") || "",
            dueFrom,
            dueTo,
            minAmount: searchParams.get("minAmount") || "",
            maxAmount: searchParams.get("maxAmount") || "",
            onlyOutstanding: searchParams.get("onlyOutstanding") || "Y",

            book: searchParams.get("book") || "",
            cd: searchParams.get("cd") || "",
            ledgerCode: searchParams.get("ledgerCode") || "",

            godown: searchParams.get("godown") || "",
            transport: searchParams.get("transport") || "",
            form: searchParams.get("form") || "",
            challan: searchParams.get("challan") || "",
            account: searchParams.get("account") || "",

            batch: searchParams.get("batch") || "",
            company: searchParams.get("company") || "",

            page: restriction.isMrRestricted ? 1 : page,
            limit: fetchLimit,

            sortField: searchParams.get("sortField") || "DDATE",
            sortOrder: (Number(searchParams.get("sortOrder") || -1) === 1 ? 1 : -1) as 1 | -1,
            companyId,
            companyVfpMatch,
        };

        const data = await OutstandingReport.get(filter);

        if (restriction.isMrRestricted && data) {
            if (Array.isArray(data.rows)) {
                const filteredRows = data.rows.filter((item: any) => restriction.isPartyAllowed(item));
                data.total = filteredRows.length;
                data.limit = limit;
                data.page = page;
                data.totalPages = Math.ceil(filteredRows.length / limit) || 1;
                data.rows = filteredRows.slice((page - 1) * limit, page * limit);

                // Recalculate ALL summary values after hierarchy filtering so
                // restricted users never receive aggregate values containing
                // another user's parties.
                data.totalOutstanding = filteredRows.reduce(
                    (sum: number, r: any) => sum + Number(r.FINAL || 0),
                    0
                );

                data.criticalOverdueAmount = filteredRows.reduce((sum: number, r: any) => {
                    const overdueDays = Number(r.DUEDAYS || 0);
                    return overdueDays > 90 ? sum + Number(r.FINAL || 0) : sum;
                }, 0);
                data.criticalOverdueCount = filteredRows.reduce((count: number, r: any) => {
                    return Number(r.DUEDAYS || 0) > 90 ? count + 1 : count;
                }, 0);
                data.customerCount = new Set(
                    filteredRows.map((r: any) => String(r.ORD || r.CODEP || "").trim()).filter(Boolean)
                ).size;
                data.avgOutstandingAmount = filteredRows.length
                    ? Math.round(Number(data.totalOutstanding || 0) / filteredRows.length)
                    : 0;
            }
        }

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error("Outstanding Report API Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: error.message || "Internal Server Error",
            },
            { status: 500 }
        );
    }
}