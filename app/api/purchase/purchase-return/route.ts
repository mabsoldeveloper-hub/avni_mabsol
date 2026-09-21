import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchaseReturn from "@/models/PurchaseReturn";
import PurchaseBill from "@/models/PurchaseBill";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import { consumeNextVoucherNumber, peekNextVoucherNumber } from "@/lib/voucherSeriesHelper";
import { getCurrentUser } from "@/lib/auth";
import { applyStockMovement } from "@/lib/stockService";

export const dynamic = "force-dynamic";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Action 1: Preview next voucher number
    if (action === "nextNumber") {
      const nextVcn = await peekNextVoucherNumber("DEBIT_NOTE");
      return NextResponse.json({ success: true, nextVcn });
    }

    // Action 2: Summary Metrics
    if (action === "metrics") {
      const today = todayStr();
      const [totalAgg, todayAgg] = await Promise.all([
        PurchaseReturn.aggregate([
          { $group: { _id: null, totalAmount: { $sum: "$netAmount" }, count: { $sum: 1 } } }
        ]),
        PurchaseReturn.aggregate([
          { $match: { returnDate: today } },
          { $group: { _id: null, totalAmount: { $sum: "$netAmount" }, count: { $sum: 1 } } }
        ])
      ]);

      return NextResponse.json({
        success: true,
        totalReturnsAmount: totalAgg[0]?.totalAmount || 0,
        totalReturnsCount: totalAgg[0]?.count || 0,
        todayReturnsAmount: todayAgg[0]?.totalAmount || 0,
        todayReturnsCount: todayAgg[0]?.count || 0,
      });
    }

    // Action 3: Vendor Bills for line items selection
    if (action === "vendorBills") {
      const vendorId = (searchParams.get("vendorId") || "").trim();
      const vendorName = (searchParams.get("vendorName") || "").trim();
      const billNo = (searchParams.get("billNo") || "").trim();

      const orList: any[] = [];
      if (billNo) {
        const billRegex = new RegExp(billNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        orList.push({ billNumber: billRegex });
        orList.push({ supplierInvoiceNo: billRegex });
      }
      if (vendorId) {
        orList.push({ vendorId });
        orList.push({ vendorCode: vendorId });
      }
      if (vendorName) {
        const cleanName = vendorName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        orList.push({ vendorName: new RegExp(cleanName, "i") });
        const firstName = vendorName.split(/\s+/)[0];
        if (firstName && firstName.length > 2) {
          orList.push({ vendorName: new RegExp(firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
        }
      }

      const query = orList.length > 0 ? { $or: orList } : {};

      const bills = await PurchaseBill.find(query)
        .sort({ billDate: -1, createdAt: -1 })
        .limit(50)
        .lean();

      // Filter out bills that have already been fully returned
      const activeBills = bills.filter((b: any) => {
        const retAmt = Number(b.returnedAmount || 0);
        const netAmt = Number(b.netAmount || 0);
        return b.paymentStatus !== "Returned" && !(retAmt >= netAmt && netAmt > 0);
      });

      return NextResponse.json({
        success: true,
        bills: activeBills,
      });
    }

    // Action 4: Default - List Purchase Returns with Pagination & Search
    const search = (searchParams.get("search") || "").trim();
    const vendorId = (searchParams.get("vendorId") || "").trim();
    const companyId = (searchParams.get("companyId") || "").trim();
    const fyId = (searchParams.get("fyId") || "").trim();
    const fyCode = (searchParams.get("fyCode") || "").trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    let query: any = {};

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { vcn: regex },
        { vendorName: regex },
        { vendorCode: regex },
        { originalBillNo: regex },
        { reason: regex },
      ];
    }

    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (companyId && companyId !== "ALL") {
      query.companyId = companyId;
    }

    if (fyId && fyId !== "ALL") {
      query.fyId = fyId;
    } else if (fyCode && fyCode !== "ALL") {
      query.fyCode = new RegExp(`^${fyCode.trim()}$`, "i");
    }

    const [returns, total] = await Promise.all([
      PurchaseReturn.find(query).sort({ returnDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      PurchaseReturn.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      returns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error("GET Purchase Return Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      returnDate,
      originalBillNo,
      companyId,
      companyCode,
      fyId,
      fyCode,
      vendorId,
      vendorCode,
      vendorName,
      vendorGst,
      vendorPhone,
      vendorAddress,
      vendorCity,
      reason,
      deductFromInventory,
      items,
      subtotal,
      totalDiscount,
      cgst,
      sgst,
      igst,
      totalTax,
      roundOff,
      netAmount,
      remarks,
    } = body;

    if (!vendorName) {
      return NextResponse.json({ success: false, message: "Vendor/Supplier Name is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "At least 1 return item is required" }, { status: 400 });
    }

    // Check if original bill exists and has already been fully returned
    let existingBill: any = null;
    if (originalBillNo) {
      const cleanBillNo = String(originalBillNo).trim();
      existingBill = await PurchaseBill.findOne({
        $or: [
          { billNumber: cleanBillNo },
          { supplierInvoiceNo: cleanBillNo },
          { billNumber: new RegExp(`^${cleanBillNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          { supplierInvoiceNo: new RegExp(`^${cleanBillNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        ],
      });

      if (existingBill) {
        const netAmt = Number(existingBill.netAmount || 0);
        const retAmt = Number(existingBill.returnedAmount || 0);
        if (existingBill.paymentStatus === "Returned" || (retAmt >= netAmt && netAmt > 0)) {
          return NextResponse.json(
            {
              success: false,
              message: `Bill #${originalBillNo} has ALREADY been fully returned (Debit Note generated). Duplicate returns are blocked.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Generate unique VCN for Debit Note
    const vcn = await consumeNextVoucherNumber("DEBIT_NOTE");

    // Clean items
    const cleanedItems = items.map((item: any) => ({
      productId: item.productId || "",
      productCode: item.productCode || item.code || "",
      productName: item.productName || item.product || "Returned Item",
      hsnCode: item.hsnCode || item.hsn || "",
      batchNo: item.batchNo || item.batch || "BATCH-01",
      expDate: item.expDate || item.exp || "",
      qty: Number(item.qty) || 1,
      unit: item.unit || "Box",
      rate: Number(item.rate) || 0,
      discountPercent: Number(item.discountPercent || item.disP) || 0,
      gstPercent: Number(item.gstPercent || item.taxP) || 0,
      taxableAmount: Number(item.taxableAmount) || (Number(item.qty || 1) * Number(item.rate || 0)),
      gstAmount: Number(item.gstAmount) || 0,
      total: Number(item.total) || (Number(item.qty || 1) * Number(item.rate || 0)),
    }));

    const newReturn = await PurchaseReturn.create({
      vcn,
      returnDate: returnDate || todayStr(),
      originalBillNo: originalBillNo || "",
      companyId: companyId || "",
      companyCode: companyCode || "",
      fyId: fyId || "",
      fyCode: fyCode || "",
      vendorId: vendorId || "",
      vendorCode: vendorCode || "",
      vendorName,
      vendorGst: vendorGst || "",
      vendorPhone: vendorPhone || "",
      vendorAddress: vendorAddress || "",
      vendorCity: vendorCity || "",
      reason: reason || "Damaged Stock",
      deductFromInventory: deductFromInventory !== false,
      items: cleanedItems,
      subtotal: Number(subtotal) || 0,
      totalDiscount: Number(totalDiscount) || 0,
      cgst: Number(cgst) || 0,
      sgst: Number(sgst) || 0,
      igst: Number(igst) || 0,
      totalTax: Number(totalTax) || 0,
      roundOff: Number(roundOff) || 0,
      netAmount: Number(netAmount) || 0,
      remarks: remarks || "",
      status: "Approved",
      createdBy: "Admin",
    });

    // 1. Update linked PurchaseBill balance & returned status
    if (existingBill) {
      try {
        const retAmt = Number(netAmount || 0);
        const netAmt = Number(existingBill.netAmount || 0);
        const currentBal = Number(existingBill.balanceAmount ?? (netAmt - (existingBill.paidAmount || 0)));
        const newBal = Math.max(0, currentBal - retAmt);
        const newReturned = Number(existingBill.returnedAmount || 0) + retAmt;

        let newStatus = existingBill.paymentStatus;
        if (newReturned >= netAmt && netAmt > 0) {
          newStatus = "Returned";
        } else if (newBal === 0 && netAmt > 0) {
          newStatus = "Paid";
        }

        await PurchaseBill.findByIdAndUpdate(existingBill._id, {
          balanceAmount: Math.round(newBal * 100) / 100,
          returnedAmount: Math.round(newReturned * 100) / 100,
          paymentStatus: newStatus,
        });
      } catch (billErr) {
        console.error("Error updating PurchaseBill balance on return:", billErr);
      }
    }

    // 2. Deduct inventory through the central stock ledger.
    if (deductFromInventory !== false && Array.isArray(cleanedItems)) {
      const currentUser: any = await getCurrentUser();
      for (let i = 0; i < cleanedItems.length; i++) {
        const item: any = cleanedItems[i];
        const productCode = String(item.productCode || item.code || "").trim();
        const qty = Number(item.qty || 0);
        if (!productCode || qty <= 0) continue;
        await applyStockMovement({
          companyId: String(companyId || ""),
          companyCode: String(companyCode || ""),
          fyId: String(fyId || ""),
          fyCode: String(fyCode || ""),
          productId: String(item.productId || ""),
          productCode,
          productName: String(item.productName || ""),
          batchNo: String(item.batchNo || ""),
          expiry: String(item.expDate || ""),
          quantity: qty,
          type: "PURCHASE_RETURN",
          referenceType: "PURCHASE_RETURN",
          referenceId: String(newReturn._id),
          referenceNo: String(vcn),
          referenceKey: `PURCHASE_RETURN:${newReturn._id}:${i}`,
          rate: Number(item.rate || 0),
          mrp: 0,
          remarks: `Purchase Return ${vcn}`,
          createdBy: String(currentUser?._id || ""),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Purchase Return (Debit Note) created successfully",
      purchaseReturn: newReturn,
    });
  } catch (error: any) {
    console.error("POST Purchase Return Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "ID is required" }, { status: 400 });
    }

    const deleted = await PurchaseReturn.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Purchase return not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Purchase Return deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE Purchase Return Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}
