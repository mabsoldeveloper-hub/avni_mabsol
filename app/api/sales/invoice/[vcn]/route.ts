import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import Product from "@/models/Product";
import Batch from "@/models/Batch";
import Order from "@/models/Order";
import Customer from "@/models/Customer";

function formatInvoiceDate(rawDate: any): string {
    if (!rawDate) return "";
    if (typeof rawDate === "string") {
        const trimmed = rawDate.trim();
        const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (ymdMatch) {
            const [, y, m, d] = ymdMatch;
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (dmyMatch) {
            const [, d, m, y] = dmyMatch;
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
    }
    try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, "0");
            const day = String(d.getUTCDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        }
    } catch {}
    return String(rawDate).slice(0, 10);
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ vcn: string }> }
) {

    try {

        await connectDB();

        const { vcn: rawParamVcn } = await params;
        const { searchParams } = new URL(req.url);
        const queryVcn = searchParams.get("v") || searchParams.get("vcn") || "";

        // Collect all possible raw and decoded variations of the voucher identifier
        const vcnCandidates = new Set<string>();
        [rawParamVcn, queryVcn].filter(Boolean).forEach((tok) => {
            const str = String(tok).trim();
            if (!str) return;
            vcnCandidates.add(str);
            try {
                const d1 = decodeURIComponent(str);
                vcnCandidates.add(d1);
                const d2 = decodeURIComponent(d1);
                vcnCandidates.add(d2);
            } catch {}
            vcnCandidates.add(str.replace(/%2F/gi, "/"));
            vcnCandidates.add(str.replace(/\//g, "%2F"));
        });

        const orConditions: any[] = [];
        Array.from(vcnCandidates).forEach((c) => {
            const escaped = c.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            const reg = new RegExp(`^${escaped}$`, "i");
            orConditions.push({ VCN: c });
            orConditions.push({ VCN: reg });
        });

        // Step 1: Try exact VCN match first (prevents matching wrong bill by VOUCHER/BILLNO alias)
        let header: any = await SalesMdis.findOne({ $or: orConditions }).lean();

        // Step 2: Fallback to VOUCHER, BILLNO, INVNO if exact VCN is not found
        if (!header) {
            const fallbackConditions: any[] = [];
            Array.from(vcnCandidates).forEach((c) => {
                const escaped = c.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
                const reg = new RegExp(`^${escaped}$`, "i");
                fallbackConditions.push({ VOUCHER: c });
                fallbackConditions.push({ VOUCHER: reg });
                fallbackConditions.push({ BILLNO: c });
                fallbackConditions.push({ BILLNO: reg });
                fallbackConditions.push({ INVNO: c });
                fallbackConditions.push({ INVNO: reg });
                const num = Number(c);
                if (!isNaN(num) && num > 0) {
                    fallbackConditions.push({ VOUCHER: num });
                }
            });
            header = await SalesMdis.findOne({ $or: fallbackConditions }).lean();
        }

        const displayVcn = Array.from(vcnCandidates).find((v) => v.includes("/")) || rawParamVcn || "";

        if (!header) {
            return NextResponse.json({
                success: false,
                message: `Invoice #${displayVcn} not found`,
            });
        }

        // Format header DATE cleanly
        if (header.DATE) {
            header.DATE = formatInvoiceDate(header.DATE);
        }

        const currentUser: any = await getCurrentUser();
        const companyId = String(searchParams.get("companyId") || "").trim();
        const fyId = String(searchParams.get("fyId") || "").trim();
        if (!currentUser) return NextResponse.json({ success:false, message:"Unauthorized" }, { status:401 });

        const headerCompanyId = String(header.companyId || "").trim();
        const headerFyId = String(header.fyId || "").trim();
        if (companyId && headerCompanyId && companyId !== headerCompanyId) {
            return NextResponse.json({ success:false, message:"Invoice not found" }, { status:404 });
        }
        if (fyId && headerFyId && fyId !== headerFyId) {
            return NextResponse.json({ success:false, message:"Invoice not found" }, { status:404 });
        }

        const resolvedVcn = String(header.VCN || header.VOUCHER || displayVcn).trim();
        const resolvedVoucher = String(header.VOUCHER || header.VCN || displayVcn).trim();
        const resRegex = new RegExp(`^${resolvedVcn.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i");
        const voucRegex = new RegExp(`^${resolvedVoucher.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i");

        // Customer / Supplier Master (Order or Customer)
        const partyCode = String(header.CODEP || "").trim();
        let customer: any = null;
        if (partyCode) {
            const partyRegex = new RegExp(`^${partyCode.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i");
            customer = await Order.findOne({
                $or: [{ ORDNO: partyCode }, { CODEP: partyCode }, { ORDNO: partyRegex }, { CODEP: partyRegex }],
            }).lean();

            if (!customer) {
                customer = await Customer.findOne({
                    $or: [{ ORDNO: partyCode }, { CODEP: partyCode }, { CODE: partyCode }, { ORDNO: partyRegex }],
                }).lean();
            }
        }

        // Invoice Items (SalesDis)
        const searchKeys = new Set<string>();
        [header.VCN, header.VOUCHER, header.BILLNO, header.INVNO, ...Array.from(vcnCandidates)].forEach((k) => {
            if (k !== undefined && k !== null) {
                const s = String(k).trim();
                if (s) {
                    searchKeys.add(s);
                    const unpadded = s.replace(/^0+/, "");
                    if (unpadded) searchKeys.add(unpadded);
                }
            }
        });

        const itemConditions: any[] = [];
        searchKeys.forEach((key) => {
            const keyRegex = new RegExp(`^${key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i");
            itemConditions.push({ VCN: key });
            itemConditions.push({ VCN: keyRegex });
            itemConditions.push({ VOUCHER: key });
            itemConditions.push({ VOUCHER: keyRegex });
            itemConditions.push({ BILLNO: key });
            itemConditions.push({ BILLNO: keyRegex });
            itemConditions.push({ INVNO: key });
            itemConditions.push({ INVNO: keyRegex });
            const num = Number(key);
            if (!isNaN(num) && num > 0) {
                itemConditions.push({ VOUCHER: num });
            }
        });

        let details: any[] = await SalesDis.find({ $or: itemConditions }).lean();

        // Fallback: If no line items found by voucher keys, search by supplier/customer CODEP and DATE
        if (details.length === 0 && header.CODEP && header.DATE) {
            details = await SalesDis.find({
                CODEP: header.CODEP,
                DATE: header.DATE,
            }).lean();
        }

        // Collect all product codes to batch-fetch in one query
        const allProdCodes = details
            .map((row: any) => String(row.PRODUCT || row.CODE || "").trim())
            .filter(Boolean);

        const numericProdCodes = allProdCodes
            .map((c) => Number(c))
            .filter((n) => !isNaN(n) && n > 0);

        const batchProducts = allProdCodes.length > 0
            ? await Product.find({
                $or: [
                    { CODE: { $in: allProdCodes } },
                    { CODE: { $in: numericProdCodes } },
                    { PRODUCT: { $in: allProdCodes } },
                ],
            }).lean()
            : [];

        const prodMap = new Map<string, any>();
        (batchProducts as any[]).forEach((p: any) => {
            const key = String(p.CODE || p.PRODUCT || "").trim().toUpperCase();
            if (key) prodMap.set(key, p);
            const numKey = String(p.CODE).trim();
            if (numKey) prodMap.set(numKey, p);
        });

        const items = [];

        for (const row of details) {
            const prodCode = String(row.PRODUCT || row.CODE || "").trim();
            const product: any = prodMap.get(prodCode.toUpperCase()) || null;

            items.push({
                code: prodCode,
                product: product?.PRODUCT || row.NAME || prodCode || "",
                name: row.NAME || product?.PRODUCT || "",
                pack: row.PACK || product?.PACK || "",
                unit: row.UNIT || product?.UNIT || "",
                hsn: row.HSN || product?.HSN || "",
                company: row.COMPANY || product?.GCODE || "",
                batch: row.BATCH || "DEFAULT",
                expiry: row.EXPIRY || row.EXP || "",
                mfg: row.MFG || "",
                mrp: Number(row.MRP || 0),
                prate: Number(row.PRATE || 0),
                rate: Number(row.LPRATE || row.RATE || 0),
                qty: Number(row.QTY || 0),
                freeQty: Number(row.FREEQTY || row.FREE || 0),
                free: Number(row.FREEQTY || row.FREE || 0),
                disc: Number(row.DISC || 0),
                cashDisc: Number(row.CASHDISC || 0),
                cgst: Number(row.CGST || 0),
                sgst: Number(row.SGST || 0),
                igst: Number(row.IGST || 0),
                cess: Number(row.CESS || 0),
                taxPct: Number(row.CGST || 0) + Number(row.SGST || 0) + Number(row.IGST || 0),
                taxable: Number(row.AMOUNTT || row.AMMMOUNT || 0),
                tax: Number(row.TAXAMO || row.SSTAAMO || 0),
                amount: Number(row.AMOUNTT || 0) + Number(row.TAXAMO || row.SSTAAMO || 0),
                remark: row.REMARK || "",
            });
        }

        // ===========================
        // Summary
        // ===========================

        const summary = {

            taxable:

                Number(header.AMOUNTT || 0),

            tax:

                Number(header.TAXAMO || 0),

            cgst:

                Number(header.CGSTAMO || 0),

            sgst:

                Number(header.STAXAMO || 0),

            round:

                Number(header.ROUND || 0),

            total:

                Number(header.FINAL || 0),

        };

        return NextResponse.json({

            success: true,

            header,

            customer,

            items,

            summary,

        });

    }

    catch (err: any) {

        return NextResponse.json({

            success: false,

            message: err.message,

        });

    }

}