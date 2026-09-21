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

        const { vcn } = await params;

        const escapedVcn = vcn.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const vcnRegex = new RegExp(`^${escapedVcn}$`, "i");

        // Step 1: Try exact VCN match first (prevents matching wrong bill by VOUCHER/BILLNO alias)
        let header: any = await SalesMdis.findOne({
            $or: [{ VCN: vcn }, { VCN: vcnRegex }],
        }).lean();

        // Step 2: Fallback to VOUCHER, BILLNO, INVNO if exact VCN is not found
        if (!header) {
            header = await SalesMdis.findOne({
                $or: [
                    { VOUCHER: vcn },
                    { VOUCHER: vcnRegex },
                    { BILLNO: vcn },
                    { BILLNO: vcnRegex },
                    { INVNO: vcn },
                    { INVNO: vcnRegex },
                ],
            }).lean();
        }

        if (!header) {
            return NextResponse.json({
                success: false,
                message: `Invoice #${vcn} not found`,
            });
        }

        // Format header DATE cleanly
        if (header.DATE) {
            header.DATE = formatInvoiceDate(header.DATE);
        }

        const currentUser: any = await getCurrentUser();
        const { searchParams } = new URL(req.url);
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

        const resolvedVcn = String(header.VCN || header.VOUCHER || vcn).trim();
        const resolvedVoucher = String(header.VOUCHER || header.VCN || vcn).trim();
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
        [header.VCN, header.VOUCHER, header.BILLNO, header.INVNO, vcn].forEach((k) => {
            if (k) {
                const s = String(k).trim();
                if (s) {
                    searchKeys.add(s);
                    const unpadded = s.replace(/^0+/, "");
                    if (unpadded) searchKeys.add(unpadded);
                }
            }
        });

        const orConditions: any[] = [];
        searchKeys.forEach((key) => {
            const keyRegex = new RegExp(`^${key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i");
            orConditions.push({ VCN: key });
            orConditions.push({ VCN: keyRegex });
            orConditions.push({ VOUCHER: key });
            orConditions.push({ VOUCHER: keyRegex });
            orConditions.push({ BILLNO: key });
            orConditions.push({ BILLNO: keyRegex });
            orConditions.push({ INVNO: key });
            orConditions.push({ INVNO: keyRegex });
        });

        let details: any[] = await SalesDis.find({ $or: orConditions }).lean();

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

        const batchProducts = allProdCodes.length > 0
            ? await Product.find({
                $or: [
                    { CODE: { $in: allProdCodes } },
                    { PRODUCT: { $in: allProdCodes } },
                ],
            }).lean()
            : [];

        const prodMap = new Map<string, any>();
        (batchProducts as any[]).forEach((p: any) => {
            const key = String(p.CODE || p.PRODUCT || "").trim().toUpperCase();
            if (key) prodMap.set(key, p);
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