import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import GLedger from "@/models/GLedger";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { consumeNextVoucherNumber } from "@/lib/voucherSeriesHelper";

import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

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

    const rawType = (searchParams.get("type") || "S").toUpperCase();
    let typeFilter: any = {};
    if (rawType === "ALL") {
      typeFilter = {};
    } else if (rawType === "NET_SALE" || rawType === "S_AND_R" || rawType === "S_R" || rawType === "SALE_NET") {
      typeFilter = { TYPE: { $in: ["S", "R"] } };
    } else {
      typeFilter = { TYPE: rawType };
    }

    let invoiceFilter: any = combineFilters(typeFilter, dateMatch, companyVfpMatch);

    if (restriction.isMrRestricted) {
      const orConditions: any[] = [];

      if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
        orConditions.push({
          CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] },
        });
      }

      if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
        orConditions.push({
          COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] },
        });
      }

      if (orConditions.length > 0) {
        invoiceFilter = combineFilters(dateMatch, companyVfpMatch, { $or: orConditions });
      } else {
        invoiceFilter = combineFilters(dateMatch, companyVfpMatch, { CODEP: "NONE_MATCH" });
      }
    }

    // Invoice Header
    const invoices = await SalesMdis.find(
      invoiceFilter,
      {
        VCN: 1,
        DATE: 1,
        TYPE: 1,
        CODEP: 1,
        COMPANY: 1,
        FINAL: 1,
        AMOUNTT: 1,
        TAXAMO: 1,
        CGSTAMO: 1,
        STAXAMO: 1,
        ROUND: 1,
        IS_CONVERTED: 1,
        CONVERTED_TO: 1,
        CONVERTED_FROM: 1,
        STATUS: 1,
      }
    )
      .sort({ DATE: -1 })
      .lean();

    // Customer / Order Master
    const [orders, customers] = await Promise.all([
      Order.find({}, { ORDNO: 1, CODEP: 1, PARNAM: 1, NAME: 1, CITY: 1, GSTNO: 1, GSTHED: 1, STATE: 1 }).lean(),
      Customer.find({}, { ORDNO: 1, CODEP: 1, PARNAM: 1, NAME: 1, CITY: 1, GSTNO: 1, GSTHED: 1, STATE: 1 }).lean(),
    ]);

    // Customer Map (ORDNO / CODEP -> Customer Obj)
    const customerMap = new Map();

    const addCustomerToMap = (c: any) => {
      const obj = {
        PARNAM: c.PARNAM || c.NAME || "",
        CITY: c.CITY || "",
        GSTNO: c.GSTNO || "",
        GSTHED: c.GSTHED || "",
        STATE: c.STATE || "",
      };
      [c.ORDNO, c.CODEP, c.CODE, c.SCODE].forEach((k) => {
        if (k) {
          const key = String(k).trim().toUpperCase();
          if (key && !customerMap.has(key)) {
            customerMap.set(key, obj);
          }
        }
      });
    };

    orders.forEach(addCustomerToMap);
    customers.forEach(addCustomerToMap);

    const result = invoices.map((bill: any) => {
      const code = String(bill.CODEP || "").trim().toUpperCase();
      const customer = customerMap.get(code);

      const cgst = Number(bill.CGSTAMO || 0);
      const sgst = Number(bill.STAXAMO || 0);
      const isLocal = (customer?.GSTHED || "").toUpperCase().includes("LOCAL");
      const igst = isLocal ? 0 : Number(bill.TAXAMO || 0);
      const taxable = Number(bill.AMOUNTT || 0);
      const tax = Number(bill.TAXAMO || 0) || (cgst + sgst + igst);
      const finalAmount = Number(bill.FINAL || 0) || (taxable + tax);
      const vcn = bill.VCN || bill.VOUCHER || "";
      const voucher = bill.VOUCHER || bill.VCN || "";

      return {
        _id: bill._id,
        vcn: vcn,
        voucher: voucher,
        date: formatInvoiceDate(bill.DATE),
        type: bill.TYPE || "S",
        billType: bill.TYPE === "PROFORMA" || bill.TYPE === "ESTIMATE" ? "PROFORMA" : "S",
        isConverted: Boolean(bill.IS_CONVERTED),
        convertedToVcn: bill.CONVERTED_TO || "",
        convertedFromVcn: bill.CONVERTED_FROM || "",
        status: bill.STATUS || (bill.TYPE === "PROFORMA" ? "Proforma" : "Final"),
        code: code,
        customer: customer?.PARNAM || "",
        city: customer?.CITY || "",
        gst: customer?.GSTNO || "",
        state: customer?.STATE || "",
        gstHeading: customer?.GSTHED || "",
        taxable: taxable,
        cgst,
        sgst,
        igst,
        tax: tax,
        round: bill.ROUND || 0,
        finalAmount: finalAmount,
        total: finalAmount,
      };
    });

    return NextResponse.json({
      success: true,
      total: result.length,
      invoices: result,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message,
    });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const customerCode = String(body.CODEP || body.code || "").trim();
    if (!customerCode) {
      return NextResponse.json(
        { success: false, message: "Customer Code (CODEP) is required" },
        { status: 400 }
      );
    }

    // Hierarchy authorization: a user may create a sales invoice only for a party
    // that belongs to their accessible hierarchy/territory.
    const restriction = await getMrTerritoryRestriction();

    if (restriction.isMrRestricted) {
      const customerForAuth: any = await Customer.findOne({
        $or: [
          { CODEP: customerCode },
          { ORDNO: customerCode },
          { CODE: customerCode },
          { SCODE: customerCode },
          { CODEP: new RegExp(`^${customerCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          { ORDNO: new RegExp(`^${customerCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        ],
      }).lean();

      if (!customerForAuth || !restriction.isPartyAllowed(customerForAuth)) {
        return NextResponse.json(
          { success: false, message: "You are not allowed to create an invoice for this customer" },
          { status: 403 }
        );
      }
    }

    const rawBillType = String(body.billType || body.type || body.TYPE || "S").toUpperCase();
    const effectiveType = rawBillType.includes("PROFORMA") || rawBillType.includes("ESTIMATE") ? "PROFORMA" : "S";
    const convertFromVcn = String(body.convertFromVcn || "").trim();

    // Unique Invoice VCN from active VoucherSeries Master
    let vcn = body.VCN ? String(body.VCN).trim() : "";
    // Only generate a new VCN if none was provided by the frontend.
    // Do NOT override a valid pre-generated VCN (e.g., INV-01001 or PRF-01001).
    if (!vcn) {
      vcn = await consumeNextVoucherNumber(effectiveType === "PROFORMA" ? "PROFORMA" : "SALES");
    }
    const invoiceDate = body.DATE || new Date().toISOString().slice(0, 10);

    // Lookup Customer to resolve assigned COMPANY / GCODE / SCODE for territory tracking
    const customerObj: any = await Customer.findOne({
      $or: [
        { CODEP: customerCode },
        { ORDNO: customerCode },
        { CODEP: new RegExp(`^${customerCode}$`, "i") },
        { ORDNO: new RegExp(`^${customerCode}$`, "i") },
      ],
    }).lean();

    const customerCompany = String(
      customerObj?.COMPANY || customerObj?.GCODE || customerObj?.SCODE || ""
    ).trim();

    const items: any[] = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one product item is required for the invoice" },
        { status: 400 }
      );
    }

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;

    // Process items & update stock
    const lineItemDocs = [];

    for (const item of items) {
      const qty = Number(item.QTY || item.qty || 1);
      const freeQty = Number(item.FREEQTY || item.freeQty || 0);
      const rate = Number(item.LPRATE || item.rate || 0);
      const mrp = Number(item.MRP || item.mrp || 0);
      const prate = Number(item.PRATE || item.prate || 0);
      const discPct = Number(item.DISC || item.disc || 0);
      const cashDiscPct = Number(item.CASHDISC || item.cashDisc || 0);
      const cgstPct = Number(item.CGST || item.cgst || 0);
      const sgstPct = Number(item.SGST || item.sgst || 0);
      const igstPct = Number(item.IGST || item.igst || 0);
      const cessPct = Number(item.CESS || item.cess || 0);

      // Taxable after discount
      const grossAmount = qty * rate;
      const discAmount = grossAmount * (discPct / 100);
      let itemTaxable = grossAmount - discAmount;

      if (cashDiscPct > 0) {
        itemTaxable -= itemTaxable * (cashDiscPct / 100);
      }

      const itemCgst = itemTaxable * (cgstPct / 100);
      const itemSgst = itemTaxable * (sgstPct / 100);
      const itemIgst = itemTaxable * (igstPct / 100);
      const itemCess = itemTaxable * (cessPct / 100);

      totalTaxable += itemTaxable;
      totalCgst += itemCgst;
      totalSgst += itemSgst;
      totalIgst += itemIgst;
      totalCess += itemCess;

      const prodCode = String(item.PRODUCT || item.productCode || item.code || "").trim();
      const prodName = String(item.NAME || item.name || "").trim();

      lineItemDocs.push({
        VCN: vcn,
        VOUCHER: vcn,
        CODEP: customerCode,
        DATE: invoiceDate,
        PRODUCT: prodCode,
        CODE: prodCode,
        NAME: prodName,
        COMPANY: customerCompany,
        PACK: String(item.PACK || item.pack || ""),
        UNIT: String(item.UNIT || item.unit || ""),
        HSN: String(item.HSN || item.hsn || ""),
        QTY: qty,
        FREEQTY: freeQty,
        LPRATE: rate,
        RATE: rate,
        MRP: mrp,
        PRATE: prate,
        DISC: discPct,
        CASHDISC: cashDiscPct,
        CGST: cgstPct,
        SGST: sgstPct,
        IGST: igstPct,
        CESS: cessPct,
        AMOUNTT: itemTaxable,
        BATCH: item.BATCH || item.batch || "DEFAULT",
        EXPIRY: item.EXPIRY || item.expiry || "",
        EXP: item.EXPIRY || item.expiry || "",
        MFG: item.MFG || item.mfg || "",
        REMARK: item.REMARK || item.remark || "",
        TYPE: effectiveType,
        TRANSFER: effectiveType === "PROFORMA" ? "PROFORMA" : "S",
        _vfpTable: "vfp_new_folder_dis",
        _vfpSourceKey: `MANUAL_DIS_${vcn}_${prodCode}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      });

      // Deduct stock from Product Master (Total Deduct = Qty + Free Qty)
      const totalDeductQty = qty + freeQty;
      if (prodCode) {
        await Product.updateOne(
          { $or: [{ PRODUCT: prodCode }, { CODE: prodCode }, { NAME: prodCode }, { NAME: prodName }] },
          { $inc: { CLBAL: -totalDeductQty, STOCK: -totalDeductQty } }
        );

        if (item.BATCH || item.batch) {
          const batchNo = item.BATCH || item.batch;
          await ProductBatch.updateOne(
            { BATCH: batchNo },
            { $inc: { CLBAL: -totalDeductQty, STOCK: -totalDeductQty } }
          );
        }
      }
    }

    const totalTax = totalCgst + totalSgst + totalIgst + totalCess;
    const grossTotal = totalTaxable + totalTax;
    const finalAmount = Math.round(grossTotal);
    const round = Number((finalAmount - grossTotal).toFixed(2));

    // Save Header (SalesMdis) with resolved TYPE and STATUS
    const newHeader = await SalesMdis.create({
      VCN: vcn,
      VOUCHER: vcn,
      DATE: invoiceDate,
      CODEP: customerCode,
      COMPANY: customerCompany,
      TYPE: effectiveType,
      TRANSFER: effectiveType === "PROFORMA" ? "PROFORMA" : "S",
      STATUS: effectiveType === "PROFORMA" ? "Proforma" : "Final",
      CONVERTED_FROM: convertFromVcn || undefined,
      AMOUNTT: totalTaxable,
      CGSTAMO: totalCgst,
      STAXAMO: totalSgst,
      TAXAMO: totalTax,
      ROUND: round,
      FINAL: finalAmount,
      _vfpTable: "vfp_new_folder_mdis",
      _vfpSourceKey: `MANUAL_MDIS_${vcn}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    });

    // Save Line Items (SalesDis)
    if (lineItemDocs.length > 0) {
      await SalesDis.insertMany(lineItemDocs);
    }

    // If converted from a Proforma Invoice, update original Proforma to "Converted"
    if (convertFromVcn) {
      await SalesMdis.updateMany(
        {
          $or: [
            { VCN: convertFromVcn },
            { VCN: new RegExp(`^${convertFromVcn.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i") },
          ],
        },
        {
          $set: {
            IS_CONVERTED: true,
            CONVERTED_TO: vcn,
            STATUS: "Converted",
          },
        }
      );
    }

    // Only Debit Customer Ledger & Increase Customer Balance for Final Tax Invoices (TYPE === "S")
    if (effectiveType === "S") {
      await GLedger.create({
        CODE: customerCode,
        VCN: vcn,
        DATE: invoiceDate,
        TYPE: "S",
        DEBIT: finalAmount,
        CREDIT: 0,
        REMARK: convertFromVcn ? `Sale Invoice #${vcn} (Converted from Proforma #${convertFromVcn})` : `Sale Invoice #${vcn}`,
        _vfpTable: "vfp_new_folder_gledger",
        _vfpSourceKey: `MANUAL_GL_${vcn}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      });

      await Customer.updateOne(
        { $or: [{ CODEP: customerCode }, { ORDNO: customerCode }] },
        { $inc: { BALANCE: finalAmount, DEBIT: finalAmount } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: effectiveType === "PROFORMA" ? "Proforma Invoice created successfully" : "Sale Invoice created successfully",
        data: { vcn, finalAmount, billType: effectiveType, header: newHeader },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Sale Invoice Save Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create sale invoice" },
      { status: 500 }
    );
  }
}