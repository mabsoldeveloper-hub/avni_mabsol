import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchaseOrder from "@/models/PurchaseOrder";
import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import { consumeNextVoucherNumber, peekNextVoucherNumber } from "@/lib/voucherSeriesHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "nextNumber") {
      const nextVcn = await peekNextVoucherNumber("PURCHASE_ORDER");
      return NextResponse.json({ success: true, nextVcn });
    }

    const poId = searchParams.get("id") || searchParams.get("poId");
    const vendorId = searchParams.get("vendorId");
    const status = searchParams.get("status");
    const companyId = searchParams.get("companyId");
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();

    if (poId) {
      let po = await PurchaseOrder.findById(poId).lean();
      if (!po) {
        const mdis: any = await SalesMdis.findById(poId).lean();
        if (mdis) {
          po = {
            _id: mdis._id,
            poNumber: mdis.VCN || mdis.VOUCHER || "N/A",
            poDate: mdis.DATE ? String(mdis.DATE).slice(0, 10) : "",
            vendorName: mdis.NAME || mdis.PARNAM || mdis.CODEP || "Supplier",
            netTotal: Math.abs(Number(mdis.FINAL || 0)),
            status: "Pending",
            items: [],
            isLegacy: true,
          } as any;
        }
      }
      if (!po) {
        return NextResponse.json({ success: false, message: "Purchase order not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, order: po });
    }

    let query: any = {};

    if (companyId && companyId !== "ALL") {
      query.$or = [
        { companyId },
        { companyId: "" },
        { companyId: { $exists: false } },
      ];
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { poNumber: searchRegex },
            { vendorName: searchRegex },
            { vendorCode: searchRegex },
          ],
        },
      ];
    }

    const webOrders = await PurchaseOrder.find(query).sort({ createdAt: -1 }).lean();

    // Fetch Marg VFP Orders (TYPE: 'W' or 'PO')
    const companyVfpMatch = await getCompanyVfpFilter(searchParams);
    const fyRange = await getFYDateRange(searchParams);
    const dateMatchDate = buildFYDateQuery("DATE", fyRange.startDate, fyRange.endDate);

    const mdisOrderFilter: any = combineFilters(
      { TYPE: { $in: ["W", "PO"] } },
      dateMatchDate,
      companyVfpMatch
    );

    if (search) {
      const sReg = new RegExp(search, "i");
      mdisOrderFilter.$or = [
        { VCN: sReg },
        { VOUCHER: sReg },
        { NAME: sReg },
        { PARNAM: sReg },
        { CODEP: sReg },
      ];
    }

    const mdisOrders = await SalesMdis.find(mdisOrderFilter).sort({ DATE: -1 }).limit(100).lean();

    const seenPoNos = new Set<string>();
    webOrders.forEach((o: any) => {
      if (o.poNumber) seenPoNos.add(String(o.poNumber).trim().toUpperCase());
    });

    const legacyOrders: any[] = [];
    mdisOrders.forEach((m: any) => {
      const poNo = String(m.VCN || m.VOUCHER || "").trim();
      const poUpper = poNo.toUpperCase();
      if (poUpper && seenPoNos.has(poUpper)) return;
      if (poUpper) seenPoNos.add(poUpper);

      legacyOrders.push({
        _id: m._id,
        poNumber: poNo || "N/A",
        poDate: m.DATE ? String(m.DATE).slice(0, 10) : "",
        vendorName: m.NAME || m.PARNAM || m.CODEP || "Supplier",
        vendorCode: m.CODEP || "",
        netTotal: Math.abs(Number(m.FINAL || 0)),
        status: "Pending",
        items: [],
        isLegacy: true,
      });
    });

    const allOrders = [...webOrders, ...legacyOrders];

    return NextResponse.json({
      success: true,
      count: allOrders.length,
      orders: allOrders,
    });
  } catch (error: any) {
    console.error("GET Purchase Orders Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      companyId,
      companyCode,
      fyId,
      fyCode,
      poDate,
      expectedDeliveryDate,
      priority,
      paymentTerms,
      taxType,
      vendorId,
      vendorCode,
      vendorName,
      vendorGst,
      vendorPhone,
      vendorAddress,
      vendorCity,
      shippingAddress,
      freightCharges,
      items,
      remarks,
    } = body;

    if (!vendorName) {
      return NextResponse.json({ success: false, message: "Vendor Name is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "At least 1 product item is required" }, { status: 400 });
    }

    // Auto-generate PO Number using Voucher Series Helper if not provided
    const poNumber = body.poNumber || (await consumeNextVoucherNumber("PURCHASE_ORDER"));

    // Process & calculate item totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const processedItems = items.map((it: any) => {
      const qty = Number(it.qty || 1);
      const freeQty = Number(it.freeQty || 0);
      const rate = Number(it.rate || 0);
      const disc = Number(it.discountPercent || 0);
      const schemeDisc = Number(it.schemePercent || 0);
      const gst = Number(it.gstPercent || 12);
      const mrp = Number(it.mrp || 0);

      const gross = qty * rate;
      const discAmt = gross * (disc / 100);
      const schemeAmt = gross * (schemeDisc / 100);
      const totalItemDisc = discAmt + schemeAmt;

      const taxable = Math.max(0, gross - totalItemDisc);
      const gstAmt = taxable * (gst / 100);
      const lineTotal = taxable + gstAmt;

      subtotal += gross;
      totalDiscount += totalItemDisc;
      totalTax += gstAmt;

      return {
        productId: it.productId || "",
        productCode: it.productCode || "",
        productName: it.productName || "Product",
        hsnCode: it.hsnCode || "",
        batchNo: it.batchNo || "",
        expDate: it.expDate || "",
        mrp,
        qty,
        freeQty,
        unit: it.unit || "Box",
        rate,
        discountPercent: disc,
        schemePercent: schemeDisc,
        gstPercent: gst,
        taxableAmount: Math.round(taxable * 100) / 100,
        gstAmount: Math.round(gstAmt * 100) / 100,
        total: Math.round(lineTotal * 100) / 100,
      };
    });

    const freight = Number(freightCharges || 0);
    const isInterstate = taxType === "Interstate";

    const cgst = isInterstate ? 0 : Math.round((totalTax / 2) * 100) / 100;
    const sgst = isInterstate ? 0 : Math.round((totalTax / 2) * 100) / 100;
    const igst = isInterstate ? Math.round(totalTax * 100) / 100 : 0;

    const rawNet = subtotal - totalDiscount + totalTax + freight;
    const netTotal = Math.round(rawNet);
    const roundOff = Math.round((netTotal - rawNet) * 100) / 100;

    const newPO = await PurchaseOrder.create({
      poNumber,
      companyId: companyId || "",
      companyCode: companyCode || "",
      fyId: fyId || "",
      fyCode: fyCode || "",
      poDate: poDate || new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: expectedDeliveryDate || "",
      priority: priority || "Normal",
      paymentTerms: paymentTerms || "30 Days Credit",
      taxType: taxType || "Intrastate",
      vendorId: vendorId || "",
      vendorCode: vendorCode || "",
      vendorName,
      vendorGst: vendorGst || "",
      vendorPhone: vendorPhone || "",
      vendorAddress: vendorAddress || "",
      vendorCity: vendorCity || "",
      shippingAddress: shippingAddress || "",
      items: processedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      freightCharges: freight,
      totalTax: Math.round(totalTax * 100) / 100,
      cgst,
      sgst,
      igst,
      roundOff,
      netTotal,
      status: "Pending",
      remarks: remarks || "",
    });

    // -------------------------------------------------------------
    // SAVE TO MARG VFP TABLES: SalesMdis (Header), SalesDis (Items)
    // -------------------------------------------------------------
    try {
      const vfpDate = poDate || new Date().toISOString().slice(0, 10);
      const vfpVendorCode = String(vendorCode || vendorId || "SUPP001").trim().toUpperCase();

      await SalesMdis.create({
        VOUCHER: poNumber,
        VCN: poNumber,
        TYPE: "W",
        CODEP: vfpVendorCode,
        NAME: vendorName,
        PARNAM: vendorName,
        DATE: vfpDate,
        FINAL: netTotal,
        NETAMT: netTotal,
        AMOUNT: subtotal,
        DISCOUNT: totalDiscount,
        TAXAMO: totalTax,
        FREIGHT: freight,
        PONO: poNumber,
        companyId: companyId || "",
        companyCode: companyCode || "",
        fyId: fyId || "",
        fyCode: fyCode || "",
        _vfpTable: "mdis",
        _vfpSourceKey: `W_${poNumber}`,
      });

      for (let i = 0; i < processedItems.length; i++) {
        const item: any = processedItems[i];
        await SalesDis.create({
          VOUCHER: poNumber,
          VCN: poNumber,
          TYPE: "W",
          CODE: item.productCode || item.productId || `P${i + 1}`,
          BATCH: item.batchNo || "",
          QTY: Number(item.qty || 0),
          FREE: Number(item.freeQty || 0),
          RATE: Number(item.rate || 0),
          MRP: Number(item.mrp || 0),
          EXP: item.expDate || "",
          DISC1: Number(item.discountPercent || 0),
          CGST: cgst ? cgst : 0,
          SSTA: sgst ? sgst : 0,
          IGST: igst ? igst : 0,
          AMMMWOD: Number(item.taxableAmount || 0),
          AMMMOUNT: Number(item.total || 0),
          companyId: companyId || "",
          companyCode: companyCode || "",
          fyId: fyId || "",
          fyCode: fyCode || "",
          _vfpTable: "dis",
          _vfpSourceKey: `W_${poNumber}_${item.productCode || i}`,
        });
      }
    } catch (margErr) {
      console.error("Error saving Purchase Order to Marg VFP tables (SalesMdis/SalesDis):", margErr);
    }

    return NextResponse.json({
      success: true,
      message: "Purchase Order created successfully",
      order: newPO,
    });
  } catch (error: any) {
    console.error("POST Purchase Order Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to create PO" }, { status: 500 });
  }
}

