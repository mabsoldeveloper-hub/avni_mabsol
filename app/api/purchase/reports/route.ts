import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseOrder from "@/models/PurchaseOrder";
import PurchaseReturn from "@/models/PurchaseReturn";
import PurchasePayment from "@/models/PurchasePayment";
import SalesMdis from "@/models/SalesMdis";
import Pendings from "@/models/Pendings";
import Customer from "@/models/Customer";
import { getFYDateRange } from "@/lib/financialYearHelper";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId") || "";
    const fyRange = await getFYDateRange(searchParams);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const sDate = startDate || fyRange.startDate || "";
    const eDate = endDate || fyRange.endDate || "";
    const vendorName = searchParams.get("vendorName") || "";
    const status = searchParams.get("status") || "ALL";

    // 1. Build Base Date Filter
    let dateFilter: any = {};
    if (sDate && eDate) {
      dateFilter = { $gte: sDate, $lte: eDate };
    } else if (sDate) {
      dateFilter = { $gte: sDate };
    } else if (eDate) {
      dateFilter = { $lte: eDate };
    }

    // 2. Build Vendor Regex
    const vendorRegex = vendorName ? new RegExp(vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") : null;

    // -------------------------------------------------------------
    // FETCH INVOICES
    // -------------------------------------------------------------
    const billQuery: any = {};
    if (companyId) billQuery.companyId = companyId;
    if (Object.keys(dateFilter).length > 0) billQuery.billDate = dateFilter;
    if (vendorRegex) billQuery.vendorName = vendorRegex;
    if (status !== "ALL") billQuery.paymentStatus = status;

    const webBills = await PurchaseBill.find(billQuery).sort({ billDate: -1 }).lean();

    const seenBillNos = new Set<string>();
    webBills.forEach((b: any) => {
      const key = String(b.billNumber || b.supplierInvoiceNo || "").trim().toUpperCase();
      if (key) seenBillNos.add(key);
    });

    // Fetch legacy VFP bills from SalesMdis
    const vfpBillQuery: any = { TYPE: { $in: ["P", "PURCHASE"] } };
    if (vendorRegex) vfpBillQuery.NAME = vendorRegex;
    if (Object.keys(dateFilter).length > 0) vfpBillQuery.DATE = dateFilter;

    const vfpBills = await SalesMdis.find(vfpBillQuery).sort({ DATE: -1 }).limit(200).lean();

    // Map VFP bills into uniform format, filtering out duplicates
    const mappedVfpBills: any[] = [];
    vfpBills.forEach((v: any) => {
      const billNo = String(v.VCN || v.VOUCHER || v.PM || v.VNO || "").trim();
      const upperNo = billNo.toUpperCase();
      if (upperNo && seenBillNos.has(upperNo)) return;
      if (upperNo) seenBillNos.add(upperNo);

      const net = Math.abs(Number(v.FINAL || v.AMOUNT || 0));
      mappedVfpBills.push({
        _id: v._id,
        billNumber: billNo || "VFP-PUR",
        supplierInvoiceNo: v.PM || v.INVNO || v.VNO || "N/A",
        billDate: v.DATE ? String(v.DATE).slice(0, 10) : "",
        vendorName: v.NAME || v.PARNAM || v.CODEP || "VFP Supplier",
        vendorGst: v.GST || "",
        netAmount: net,
        paidAmount: net,
        balanceAmount: 0,
        paymentStatus: "Paid",
        taxType: "Intrastate",
        isLegacy: true,
      });
    });

    // Combine Web + VFP Bills
    const allInvoices = [...webBills, ...mappedVfpBills];

    // -------------------------------------------------------------
    // FETCH PURCHASE ORDERS
    // -------------------------------------------------------------
    const poQuery: any = {};
    if (companyId) poQuery.companyId = companyId;
    if (Object.keys(dateFilter).length > 0) poQuery.poDate = dateFilter;
    if (vendorRegex) poQuery.vendorName = vendorRegex;

    const allOrders = await PurchaseOrder.find(poQuery).sort({ poDate: -1 }).lean();

    // -------------------------------------------------------------
    // FETCH PURCHASE RETURNS (DEBIT NOTES)
    // -------------------------------------------------------------
    const returnQuery: any = {};
    if (companyId) returnQuery.companyId = companyId;
    if (Object.keys(dateFilter).length > 0) returnQuery.returnDate = dateFilter;
    if (vendorRegex) returnQuery.vendorName = vendorRegex;

    const allReturns = await PurchaseReturn.find(returnQuery).sort({ returnDate: -1 }).lean();

    // -------------------------------------------------------------
    // FETCH PAYMENTS
    // -------------------------------------------------------------
    const paymentQuery: any = {};
    if (companyId) paymentQuery.companyId = companyId;
    if (Object.keys(dateFilter).length > 0) paymentQuery.paymentDate = dateFilter;
    if (vendorRegex) paymentQuery.vendorName = vendorRegex;

    const allPayments = await PurchasePayment.find(paymentQuery).sort({ paymentDate: -1 }).lean();

    // -------------------------------------------------------------
    // CALCULATE AGGREGATED EXECUTIVE METRICS
    // -------------------------------------------------------------
    const totalInwardValue = allInvoices.reduce((s, b) => s + Number(b.netAmount || 0), 0);
    const totalPaidAmount = allPayments.reduce((s, p) => s + Number(p.amount || 0), 0) + allInvoices.reduce((s, b) => s + Number(b.paidAmount || 0), 0);
    const totalReturnsValue = allReturns.reduce((s, r) => s + Number(r.netAmount || 0), 0);
    const totalOutstandingBalance = allInvoices.reduce((s, b) => s + Number(b.balanceAmount || 0), 0);

    const totalOrdersValue = allOrders.reduce((s, o) => s + Number(o.netTotal || 0), 0);

    // -------------------------------------------------------------
    // GROUP SUPPLIER WISE SUMMARIES
    // -------------------------------------------------------------
    const supplierMap: Record<string, any> = {};

    allInvoices.forEach((b: any) => {
      const name = (b.vendorName || "Unknown Supplier").trim();
      if (!supplierMap[name]) {
        supplierMap[name] = {
          vendorName: name,
          vendorGst: b.vendorGst || "",
          invoicesCount: 0,
          inwardTotal: 0,
          paidTotal: 0,
          returnsTotal: 0,
          outstandingBalance: 0,
        };
      }
      supplierMap[name].invoicesCount += 1;
      supplierMap[name].inwardTotal += Number(b.netAmount || 0);
      supplierMap[name].paidTotal += Number(b.paidAmount || 0);
      supplierMap[name].outstandingBalance += Number(b.balanceAmount || 0);
    });

    allReturns.forEach((r: any) => {
      const name = (r.vendorName || "Unknown Supplier").trim();
      if (supplierMap[name]) {
        supplierMap[name].returnsTotal += Number(r.netAmount || 0);
      }
    });

    const supplierSummaries = Object.values(supplierMap);

    return NextResponse.json({
      success: true,
      summary: {
        totalInwardValue,
        totalPaidAmount,
        totalReturnsValue,
        totalOutstandingBalance,
        totalOrdersValue,
        invoicesCount: allInvoices.length,
        ordersCount: allOrders.length,
        returnsCount: allReturns.length,
        paymentsCount: allPayments.length,
        suppliersCount: supplierSummaries.length,
      },
      invoices: allInvoices,
      orders: allOrders,
      returns: allReturns,
      payments: allPayments,
      supplierSummaries,
    });
  } catch (error: any) {
    console.error("GET Purchase Reports Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch purchase reports" },
      { status: 500 }
    );
  }
}
