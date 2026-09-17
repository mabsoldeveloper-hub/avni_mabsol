import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import Pendings from "@/models/Pendings";
import Customer from "@/models/Customer";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const rawCode = (searchParams.get("code") || "").trim();

    if (!rawCode) {
      return NextResponse.json({
        success: true,
        summary: {
          totalInvoices: 0,
          totalAmount: 0,
          totalTaxable: 0,
          outstandingAmount: 0,
          lastBillDate: "",
          lastBillVcn: "",
          topProducts: [],
        },
        invoices: [],
      });
    }

    const codeUpper = rawCode.toUpperCase();

    // Hierarchy access check: a user may only view history for parties
    // assigned to the user or anyone in the user's accessible downline.
    const restriction = await getMrTerritoryRestriction();

    // 1. Fetch Customer Master to get matching CODEP / ORDNO variants & balance
    const customer: any = await Customer.findOne({
      $or: [
        { CODEP: rawCode },
        { ORDNO: rawCode },
        { CODEP: new RegExp(`^${rawCode}$`, "i") },
        { ORDNO: new RegExp(`^${rawCode}$`, "i") },
      ],
    }).lean();

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    if (!restriction.isPartyAllowed(customer)) {
      return NextResponse.json(
        { success: false, message: "Customer history not found" },
        { status: 404 }
      );
    }

    const codeVariants = Array.from(
      new Set(
        [
          rawCode,
          codeUpper,
          customer?.CODEP,
          customer?.ORDNO,
          customer?.SCODE,
        ]
          .filter(Boolean)
          .map((c) => String(c).trim())
      )
    );

    // 2. Fetch Sales Invoice Headers (SalesMdis) for this customer
    const rawMdisInvoices = await SalesMdis.find({
      $or: [
        { CODEP: { $in: codeVariants } },
        { CODEP: { $in: codeVariants.map((c) => new RegExp(`^${c}$`, "i")) } },
      ],
    })
      .sort({ DATE: -1 })
      .limit(50)
      .lean();

    const vcns = Array.from(
      new Set(rawMdisInvoices.map((inv: any) => String(inv.VCN || "").trim()).filter(Boolean))
    );

    // 3. Fetch Line Items from SalesDis for these VCNs
    let lineItems: any[] = [];
    if (vcns.length > 0) {
      lineItems = await SalesDis.find({
        VCN: { $in: vcns },
      }).lean();
    }

    // 4. Fetch Pending Bills from Pendings for balance & status mapping
    let pendingDocs: any[] = [];
    if (vcns.length > 0 || codeVariants.length > 0) {
      pendingDocs = await Pendings.find({
        $or: [
          { VCN: { $in: vcns } },
          { ORD: { $in: codeVariants } },
        ],
      }).lean();
    }

    // Maps for fast lookup
    const itemsMap = new Map<string, any[]>();
    lineItems.forEach((item: any) => {
      const vcnKey = String(item.VCN || "").trim().toUpperCase();
      if (!itemsMap.has(vcnKey)) {
        itemsMap.set(vcnKey, []);
      }
      itemsMap.get(vcnKey)!.push({
        product: item.PRODUCT || item.CODE || "",
        name: item.NAME || item.PRODUCT || "Unknown Product",
        qty: Number(item.QTY || 0),
        freeQty: Number(item.FREEQTY || 0),
        rate: Number(item.LPRATE || item.RATE || 0),
        mrp: Number(item.MRP || 0),
        disc: Number(item.DISC || 0),
        cgst: Number(item.CGST || 0),
        sgst: Number(item.SGST || 0),
        igst: Number(item.IGST || 0),
        batch: item.BATCH || "",
        expiry: item.EXPIRY || "",
        amount: Number(item.AMOUNTT || (item.QTY || 1) * (item.LPRATE || 0)),
      });
    });

    const pendingMap = new Map<string, any>();
    pendingDocs.forEach((p: any) => {
      const key = String(p.VCN || p.VOUCHER || "").trim().toUpperCase();
      if (key) {
        pendingMap.set(key, p);
      }
    });

    // Top Products Aggregation Map
    const productFrequencyMap = new Map<string, { name: string; qty: number; amount: number }>();

    // 5. Structure Invoice Response List
    let totalSalesAmount = 0;
    let totalTaxableAmount = 0;

    const invoices = rawMdisInvoices.map((bill: any) => {
      const vcn = String(bill.VCN || "").trim();
      const vcnKey = vcn.toUpperCase();
      const billDate = bill.DATE || "";
      const taxable = Number(bill.AMOUNTT || 0);
      const cgst = Number(bill.CGSTAMO || 0);
      const sgst = Number(bill.STAXAMO || 0);
      const tax = Number(bill.TAXAMO || cgst + sgst);
      const finalAmount = Number(bill.FINAL || taxable + tax);

      totalSalesAmount += finalAmount;
      totalTaxableAmount += taxable;

      const items = itemsMap.get(vcnKey) || [];

      // Aggregate top products
      items.forEach((it) => {
        const pKey = (it.name || it.product || "").trim();
        if (pKey) {
          const current = productFrequencyMap.get(pKey) || { name: pKey, qty: 0, amount: 0 };
          current.qty += it.qty;
          current.amount += it.amount;
          productFrequencyMap.set(pKey, current);
        }
      });

      // Pendings lookup
      const pend = pendingMap.get(vcnKey);
      let pendingAmount = pend ? Math.abs(Number(pend.BALANCE || 0)) : 0;
      let status = "Paid";

      if (pend) {
        if (pendingAmount <= 0) {
          status = "Paid";
        } else if (pendingAmount < finalAmount) {
          status = "Partial";
        } else {
          status = "Pending";
        }
      }

      return {
        _id: bill._id,
        vcn,
        date: billDate,
        type: bill.TYPE || "S",
        billType: bill.TYPE === "PROFORMA" || bill.TYPE === "ESTIMATE" ? "PROFORMA" : "S",
        isConverted: Boolean(bill.IS_CONVERTED),
        convertedToVcn: bill.CONVERTED_TO || "",
        taxable,
        cgst,
        sgst,
        tax,
        round: Number(bill.ROUND || 0),
        finalAmount,
        pendingAmount,
        status: bill.STATUS || (bill.TYPE === "PROFORMA" ? "Proforma" : status),
        itemsCount: items.length,
        items,
      };
    });

    // Top 5 products by quantity purchased
    const topProducts = Array.from(productFrequencyMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const summary = {
      totalInvoices: invoices.length,
      totalAmount: totalSalesAmount,
      totalTaxable: totalTaxableAmount,
      outstandingAmount: Number(customer?.BALANCE || 0),
      lastBillDate: invoices.length > 0 ? invoices[0].date : "",
      lastBillVcn: invoices.length > 0 ? invoices[0].vcn : "",
      topProducts,
    };

    return NextResponse.json({
      success: true,
      summary,
      invoices,
    });
  } catch (err: any) {
    console.error("Failed to fetch customer history:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to fetch customer invoice history",
      },
      { status: 500 }
    );
  }
}
