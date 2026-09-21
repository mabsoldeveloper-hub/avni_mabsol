import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseOrder from "@/models/PurchaseOrder";
import PurchasePayment from "@/models/PurchasePayment";
import SalesMdis from "@/models/SalesMdis";
import Pendings from "@/models/Pendings";
import { consumeNextVoucherNumber, peekNextVoucherNumber } from "@/lib/voucherSeriesHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";
import { getCurrentUser } from "@/lib/auth";
import { applyStockMovement } from "@/lib/stockService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "nextNumber") {
      const nextVcn = await peekNextVoucherNumber("PURCHASE");
      return NextResponse.json({ success: true, nextVcn });
    }

    const billId = searchParams.get("id");
    const vendorId = searchParams.get("vendorId");
    const companyId = searchParams.get("companyId");
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();

    if (billId) {
      let bill = await PurchaseBill.findById(billId).lean();
      if (!bill) {
        // Fallback to check SalesMdis / Pendings
        const mdis = await SalesMdis.findById(billId).lean();
        if (mdis) {
          bill = {
            _id: mdis._id,
            billNumber: mdis.VCN || mdis.VOUCHER || "N/A",
           //upplierInvoiceNo: mdis.SUPPINVNO || "VFP-INV",
            supplierInvoiceNo: mdis.SUPPINVNO || "",
            billDate: mdis.DATE ? String(mdis.DATE).slice(0, 10) : "",
            vendorName: mdis.NAME || mdis.PARNAM || "Supplier",
            netAmount: Math.abs(Number(mdis.FINAL || 0)),
            balanceAmount: Math.abs(Number(mdis.FINAL || 0)),
            paymentStatus: "Pending",
            items: [],
          } as any;
        }
      }
      if (!bill) {
        return NextResponse.json({ success: false, message: "Purchase bill not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, bill });
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

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { billNumber: searchRegex },
            { supplierInvoiceNo: searchRegex },
            { vendorName: searchRegex },
            { poNumber: searchRegex },
          ],
        },
      ];
    }

    const webBills = await PurchaseBill.find(query).sort({ createdAt: -1 }).lean();

    // Fetch Legacy VFP Purchase Bills from SalesMdis & Pendings
    const companyVfpMatch = await getCompanyVfpFilter(searchParams);
    const fyRange = await getFYDateRange(searchParams);
    const dateMatchDate = buildFYDateQuery("DATE", fyRange.startDate, fyRange.endDate);

    const purchaseMdisFilter: any = combineFilters(
      { TYPE: { $in: ["P", "PURCHASE"] } },
      dateMatchDate,
      companyVfpMatch
    );

    if (search) {
      const sReg = new RegExp(search, "i");
      purchaseMdisFilter.$or = [
        { VCN: sReg },
        { VOUCHER: sReg },
        { NAME: sReg },
        { PARNAM: sReg },
      ];
    }

    const [mdisRows, pendingsRows] = await Promise.all([
      SalesMdis.find(purchaseMdisFilter).sort({ DATE: -1 }).limit(150).lean(),
      Pendings.find(combineFilters({ ACGROUP: /^D/i, INVTYPE: "I" }, companyVfpMatch)).limit(150).lean(),
    ]);

    const legacyBills: any[] = [];
    const seenVcn = new Set<string>();

    webBills.forEach((b: any) => {
      if (b.billNumber) seenVcn.add(b.billNumber);
    });

    mdisRows.forEach((row: any) => {
      const vcn = row.VCN || row.VOUCHER || "";
      if (vcn && !seenVcn.has(vcn)) {
        seenVcn.add(vcn);
        const finalAmt = Math.abs(Number(row.FINAL || row.NETAMT || 0));
        legacyBills.push({
          _id: row._id,
          billNumber: vcn,

          // supplierInvoiceNo: row.SUPPINVNO || row.INVNO || "VFP-INV",

          supplierInvoiceNo: row.SUPPINVNO || row.INVNO || "",

          billDate: row.DATE ? String(row.DATE).slice(0, 10) : "",
          vendorName: row.NAME || row.PARNAM || row.CODEP || "Supplier",
          poNumber: row.PONO || "",
          netAmount: finalAmt,
          paidAmount: 0,
          balanceAmount: finalAmt,
          paymentStatus: "Pending",
          items: [],
          isLegacy: true,
        });
      }
    });

    pendingsRows.forEach((row: any) => {
      const vcn = row.VCN || row.VOUCHER || "";
      if (vcn && !seenVcn.has(vcn)) {
        seenVcn.add(vcn);
        const bal = Math.abs(Number(row.BALANCE || 0));
        const billAmt = Math.abs(Number(row.BILLAMT || row.NETAMT || bal));
        legacyBills.push({
          _id: row._id,
          billNumber: vcn,
          
        // supplierInvoiceNo: row.ORD || "VFP-INV",

           supplierInvoiceNo: row.ORD || "",

          billDate: row.DDATE ? String(row.DDATE).slice(0, 10) : "",
          vendorName: row.PARNAM || row.NAME || row.CODEP || "Supplier",
          poNumber: "",
          netAmount: billAmt,
          paidAmount: Math.max(0, billAmt - bal),
          balanceAmount: bal,
          paymentStatus: bal === 0 ? "Paid" : bal < billAmt ? "Partial" : "Pending",
          items: [],
          isLegacy: true,
        });
      }
    });

    const allBills = [...webBills, ...legacyBills];

    return NextResponse.json({
      success: true,
      count: allBills.length,
      bills: allBills,
    });
  } catch (error: any) {
    console.error("GET Purchase Bills Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      supplierInvoiceNo,
      poId,
      poNumber,
      companyId,
      companyCode,
      fyId,
      fyCode,
      billDate,
      dueDate,
      vendorId,
      vendorCode,
      vendorName,
      vendorGst,
      vendorPhone,
      vendorAddress,
      items,
      remarks,
      paidAmount,
    } = body;

    if (!vendorName) {
      return NextResponse.json({ success: false, message: "Vendor Name is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "At least 1 item is required in the purchase bill" }, { status: 400 });
    }

    // Auto-generate Bill Number using Voucher Series Helper if not provided
    const billNumber = body.billNumber || (await consumeNextVoucherNumber("PURCHASE"));

    // Item calculation
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const processedItems = items.map((it: any) => {
      const qty = Number(it.qty || 1);
      const freeQty = Number(it.freeQty || 0);
      const rate = Number(it.rate || 0);
      const disc = Number(it.discountPercent || 0);
      const gst = Number(it.gstPercent || 12);

      const gross = qty * rate;
      const discAmt = gross * (disc / 100);
      const taxable = gross - discAmt;
      const gstAmt = taxable * (gst / 100);
      const lineTotal = taxable + gstAmt;

      subtotal += gross;
      totalDiscount += discAmt;
      totalTax += gstAmt;

      return {
        productId: it.productId || "",
        productCode: it.productCode || "",
        productName: it.productName || "Product",
        hsnCode: it.hsnCode || "",
        batchNo: it.batchNo || "BATCH-01",
        expDate: it.expDate || "",
        mfgDate: it.mfgDate || "",
        mrp: Number(it.mrp || 0),
        qty,
        freeQty,
        unit: it.unit || "Box",
        rate,
        discountPercent: disc,
        gstPercent: gst,
        taxableAmount: Math.round(taxable * 100) / 100,
        gstAmount: Math.round(gstAmt * 100) / 100,
        total: Math.round(lineTotal * 100) / 100,
      };
    });

    const netAmount = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;
    const paid = Number(paidAmount || 0);
    const balanceAmount = Math.max(0, Math.round((netAmount - paid) * 100) / 100);

    // Handle unique bill number generation
    let finalBillNumber = body.billNumber;
    if (!finalBillNumber) {
      finalBillNumber = await consumeNextVoucherNumber("PURCHASE");
    }

    const existingBill = await PurchaseBill.findOne({ billNumber: finalBillNumber }).lean();
    if (existingBill) {
      finalBillNumber = await consumeNextVoucherNumber("PURCHASE");
      const checkAgain = await PurchaseBill.findOne({ billNumber: finalBillNumber }).lean();
      if (checkAgain) {
        finalBillNumber = `PUR-${Date.now().toString().slice(-6)}`;
      }
    }

    // Payment Status enum strictly matching Mongoose schema: "Pending" | "Partial" | "Paid"
    let paymentStatus: "Paid" | "Partial" | "Pending" = "Pending";
    if (paid >= netAmount && netAmount > 0) {
      paymentStatus = "Paid";
    } else if (paid > 0) {
      paymentStatus = "Partial";
    }

    // Calculate GST breakdown if not provided
    const cgst = body.cgst !== undefined ? Number(body.cgst) : (body.taxType === "Intrastate" ? Math.round((totalTax / 2) * 100) / 100 : 0);
    const sgst = body.sgst !== undefined ? Number(body.sgst) : (body.taxType === "Intrastate" ? Math.round((totalTax / 2) * 100) / 100 : 0);
    const igst = body.igst !== undefined ? Number(body.igst) : (body.taxType === "Intrastate" ? 0 : Math.round(totalTax * 100) / 100);
    const roundOff = body.roundOff !== undefined ? Number(body.roundOff) : Math.round((netAmount - (subtotal - totalDiscount + totalTax)) * 100) / 100;

    const bill = await PurchaseBill.create({
      billNumber: finalBillNumber,
      supplierInvoiceNo,
      poId,
      poNumber,
      companyId,
      companyCode,
      fyId,
      fyCode,
      billDate: billDate || new Date().toISOString().slice(0, 10),
      dueDate,
      vendorId,
      vendorCode,
      vendorName,
      vendorGst,
      vendorPhone,
      vendorAddress,
      items: processedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      cgst,
      sgst,
      igst,
      totalTax: Math.round(totalTax * 100) / 100,
      roundOff,
      netAmount,
      paidAmount: paid,
      balanceAmount,
      paymentStatus,
      remarks,
    });

    // Update the new stock ledger only after the purchase bill itself is saved.
    // Qty + Free Qty is inward stock for every purchase line.
    const currentUser: any = await getCurrentUser();
    for (let i = 0; i < processedItems.length; i++) {
      const item: any = processedItems[i];
      const productCode = String(item.productCode || item.productId || "").trim();
      if (!productCode) continue;
      const batchNo = String(item.batchNo || "").trim();
      const inwardQty = Number(item.qty || 0) + Number(item.freeQty || 0);
      if (inwardQty <= 0) continue;
      await applyStockMovement({
        companyId: String(companyId || ""),
        companyCode: String(companyCode || ""),
        fyId: String(fyId || ""),
        fyCode: String(fyCode || ""),
        productId: String(item.productId || ""),
        productCode,
        productName: String(item.productName || ""),
        batchNo,
        expiry: String(item.expDate || ""),
        mfgDate: String(item.mfgDate || ""),
        quantity: inwardQty,
        type: "PURCHASE",
        referenceType: "PURCHASE_BILL",
        referenceId: String(bill._id),
        referenceNo: String(finalBillNumber),
        referenceKey: `PURCHASE:${bill._id}:${i}`,
        rate: Number(item.rate || 0),
        mrp: Number(item.mrp || 0),
        remarks: `Purchase Bill ${finalBillNumber}`,
        createdBy: String(currentUser?._id || ""),
      });
    }

    // If instant payment was entered, generate a PurchasePayment voucher for payment history & reporting
    if (paid > 0) {
      try {
        const pmtVoucherNo = await consumeNextVoucherNumber("PAYMENT");
        await PurchasePayment.create({
          voucherNo: pmtVoucherNo,
          paymentDate: billDate || new Date().toISOString().slice(0, 10),
          companyId: companyId || "",
          companyCode: companyCode || "",
          fyId: fyId || "",
          fyCode: fyCode || "",
          vendorId: vendorId || "",
          vendorCode: vendorCode || "",
          vendorName: vendorName || "",
          vendorGst: vendorGst || "",
          vendorPhone: vendorPhone || "",
          vendorCity: "",
          amount: paid,
          paymentMode: body.paymentMode || "Cash",
          refNo: finalBillNumber || supplierInvoiceNo || "",
          bankName: (body.paymentMode === "Bank Transfer" || body.paymentMode === "Cheque") ? "Bank Account" : "Cash Account",
          discountReceived: 0,
          settledBills: [
            {
              billId: String(bill._id),
              billNumber: finalBillNumber,
              originalAmount: netAmount,
              settledAmount: paid,
              remainingAmount: balanceAmount,
            },
          ],
          remarks: `Instant payment made during Purchase Bill ${finalBillNumber}`,
          status: "Approved",
          createdBy: "Admin",
        });
      } catch (pmtErr) {
        console.error("Error generating instant PurchasePayment voucher:", pmtErr);
      }
    }

    // Mark PO as Billed if linked
    if (poId) {
      await PurchaseOrder.findByIdAndUpdate(poId, { status: "Billed" });
    }

    return NextResponse.json({
      success: true,
      message: "Purchase bill created successfully",
      bill,
    });
  } catch (error: any) {
    console.error("POST Purchase Bill Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Server error while saving purchase bill" },
      { status: 500 }
    );
  }
}
