import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseOrder from "@/models/PurchaseOrder";
import PurchasePayment from "@/models/PurchasePayment";
import SalesMdis from "@/models/SalesMdis";
import Pendings from "@/models/Pendings";
import Order from "@/models/Order";
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
        // Fallback to check SalesMdis
        const mdis: any = await SalesMdis.findById(billId).lean();
        if (mdis) {
          const partyCode = String(mdis.CODEP || "").trim().toUpperCase();
          const orderDoc: any = partyCode ? await Order.findOne({ ORDNO: partyCode }).lean() : null;
          const vendorName = orderDoc?.PARNAM || orderDoc?.NAME || mdis.NAME || mdis.PARNAM || partyCode || "Supplier";
          const pm = String(mdis.PM || mdis.SUPPINVNO || mdis.INVNO || "").trim();

          const pendingDoc: any = await Pendings.findOne({
            $or: [
              ...(pm ? [{ VCN: pm }] : []),
              ...(mdis.VCN ? [{ VCN: mdis.VCN }] : []),
              ...(mdis.VOUCHER ? [{ VOUCHER: mdis.VOUCHER }, { SVOUCHER: mdis.VOUCHER }] : []),
            ],
          }).lean();

          const finalAmt = Math.abs(Number(mdis.FINAL || mdis.NETAMT || 0));
          const bal = pendingDoc ? Math.abs(Number(pendingDoc.BALANCE ?? finalAmt)) : finalAmt;
          const paid = Math.max(0, finalAmt - bal);
          const paymentStatus = bal === 0 ? "Paid" : bal < finalAmt ? "Partial" : "Pending";

          const displayBillNo = pm || mdis.VCN || mdis.VOUCHER || "N/A";
          const displaySupplierInvNo = partyCode;

          bill = {
            _id: mdis._id,
            billNumber: displayBillNo,
            supplierInvoiceNo: displaySupplierInvNo,
            voucherNo: mdis.VCN || mdis.VOUCHER || "",
            billDate: mdis.DATE ? String(mdis.DATE).slice(0, 10) : "",
            vendorName,
            netAmount: finalAmt,
            paidAmount: paid,
            balanceAmount: bal,
            paymentStatus,
            items: [],
            isLegacy: true,
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

    // Fetch Legacy VFP Purchase Bills from SalesMdis
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
      // Also find party codes matching vendor name from Order
      const matchingVendors = await Order.find(
        { $or: [{ PARNAM: sReg }, { NAME: sReg }] },
        { ORDNO: 1 }
      ).lean();
      const matchingCodes = matchingVendors.map((v: any) => v.ORDNO).filter(Boolean);

      purchaseMdisFilter.$or = [
        { VCN: sReg },
        { VOUCHER: sReg },
        { NAME: sReg },
        { PARNAM: sReg },
        { PM: sReg },
        { CODEP: sReg },
        ...(matchingCodes.length > 0 ? [{ CODEP: { $in: matchingCodes } }] : []),
      ];
    }

    const mdisRows = await SalesMdis.find(purchaseMdisFilter)
      .sort({ DATE: -1 })
      .limit(200)
      .lean();

    // Extract party codes, PM supplier invoice numbers and vouchers to enrich vendor details & balances
    const partyCodes = [...new Set(mdisRows.map((r: any) => r.CODEP).filter(Boolean))];
    const pmList = [...new Set(mdisRows.map((r: any) => r.PM).filter(Boolean))];
    const vcnList = [...new Set(mdisRows.map((r: any) => r.VCN).filter(Boolean))];
    const vchList = [...new Set(mdisRows.map((r: any) => r.VOUCHER).filter(Boolean))];

    const [orders, pendings] = await Promise.all([
      partyCodes.length > 0
        ? Order.find({ ORDNO: { $in: partyCodes } }, { ORDNO: 1, PARNAM: 1, NAME: 1 }).lean()
        : [],
      pmList.length > 0 || vcnList.length > 0 || vchList.length > 0
        ? Pendings.find({
            $or: [
              ...(pmList.length > 0 || vcnList.length > 0 ? [{ VCN: { $in: [...pmList, ...vcnList] } }] : []),
              ...(vchList.length > 0 ? [{ VOUCHER: { $in: vchList } }, { SVOUCHER: { $in: vchList } }] : []),
            ],
          }, { VCN: 1, VOUCHER: 1, SVOUCHER: 1, ORD: 1, BALANCE: 1, FINAL: 1 }).lean()
        : [],
    ]);

    const vendorMap = new Map<string, string>();
    orders.forEach((o: any) => {
      if (o.ORDNO) {
        vendorMap.set(String(o.ORDNO).trim().toUpperCase(), o.PARNAM || o.NAME || "");
      }
    });

    const pendingByVcn = new Map<string, any>();
    const pendingByVoucher = new Map<string, any>();
    pendings.forEach((p: any) => {
      const vcn = String(p.VCN || "").trim().toUpperCase();
      const vch = String(p.VOUCHER || "").trim();
      const svch = String(p.SVOUCHER || "").trim();
      if (vcn && !pendingByVcn.has(vcn)) pendingByVcn.set(vcn, p);
      if (vch && !pendingByVoucher.has(vch)) pendingByVoucher.set(vch, p);
      if (svch && !pendingByVoucher.has(svch)) pendingByVoucher.set(svch, p);
    });

    const legacyBills: any[] = [];
    const seenKeys = new Set<string>();

    webBills.forEach((b: any) => {
      if (b.billNumber) seenKeys.add(String(b.billNumber).trim().toUpperCase());
      if (b.supplierInvoiceNo) seenKeys.add(String(b.supplierInvoiceNo).trim().toUpperCase());
    });

    mdisRows.forEach((row: any) => {
      const vcn = String(row.VCN || row.VOUCHER || "").trim();
      const pm = String(row.PM || row.SUPPINVNO || row.INVNO || "").trim();
      const partyCode = String(row.CODEP || "").trim().toUpperCase();

      const displayBillNo = pm || vcn;
      const displaySupplierInvNo = partyCode;

      const vcnUpper = vcn.toUpperCase();
      const pmUpper = pm.toUpperCase();
      const billNoUpper = displayBillNo.toUpperCase();

      // Avoid duplicates against webBills or earlier legacy bills
      if (seenKeys.has(billNoUpper) || (vcnUpper && seenKeys.has(vcnUpper))) {
        return;
      }
      if (billNoUpper) seenKeys.add(billNoUpper);
      if (vcnUpper) seenKeys.add(vcnUpper);
      if (pmUpper) seenKeys.add(pmUpper);

      const finalAmt = Math.abs(Number(row.FINAL || row.NETAMT || 0));
      const p = (pmUpper && pendingByVcn.get(pmUpper)) ||
                (vcnUpper && pendingByVcn.get(vcnUpper)) ||
                (row.VOUCHER && pendingByVoucher.get(String(row.VOUCHER)));

      let bal = finalAmt;
      if (p) {
        bal = Math.abs(Number(p.BALANCE ?? finalAmt));
      }
      const paid = Math.max(0, finalAmt - bal);
      const paymentStatus = bal === 0 ? "Paid" : bal < finalAmt ? "Partial" : "Pending";
      const vendorName = vendorMap.get(partyCode) || row.NAME || row.PARNAM || partyCode || "Supplier";

      legacyBills.push({
        _id: row._id,
        billNumber: displayBillNo,
        supplierInvoiceNo: displaySupplierInvNo,
        voucherNo: vcn,
        billDate: row.DATE ? String(row.DATE).slice(0, 10) : "",
        vendorName,
        poNumber: row.PONO || "",
        netAmount: finalAmt,
        paidAmount: paid,
        balanceAmount: bal,
        paymentStatus,
        items: [],
        isLegacy: true,
      });
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
