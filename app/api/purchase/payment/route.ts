import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PurchasePayment from "@/models/PurchasePayment";
import SalesMdis from "@/models/SalesMdis";
import Pendings from "@/models/Pendings";
import Order from "@/models/Order";
import GLedger from "@/models/GLedger";
import { consumeNextVoucherNumber, peekNextVoucherNumber } from "@/lib/voucherSeriesHelper";

export const dynamic = "force-dynamic";

const clean = (v: any) => String(v ?? "").trim();
const upper = (v: any) => clean(v).toUpperCase();
const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const todayStr = () => new Date().toISOString().slice(0, 10);

function metadataFilter(companyId: string, fyId: string, fyCode: string) {
  const and: any[] = [];
  if (companyId && companyId !== "ALL") {
    and.push({ $or: [{ companyId }, { companyId: "" }, { companyId: { $exists: false } }] });
  }
  if (fyId && fyId !== "ALL") {
    and.push({ $or: [{ fyId }, { fyId: "" }, { fyId: { $exists: false } }] });
  }
  if (fyCode && fyCode !== "ALL") {
    and.push({
      $or: [
        { fyCode: new RegExp(`^${esc(fyCode)}$`, "i") },
        { fyCode: "" },
        { fyCode: { $exists: false } },
      ],
    });
  }
  return and.length ? { $and: and } : {};
}

async function findSupplierCodes(vendorId: string, vendorCode: string, vendorName: string) {
  const values = new Set<string>();
  [vendorId, vendorCode].forEach((v) => {
    const x = upper(v);
    if (x) values.add(x);
  });
  if (vendorName) {
    const rx = new RegExp(`^${esc(vendorName)}$`, "i");
    const rows = await Order.find({ $or: [{ PARNAM: rx }, { NAME: rx }] }, { ORDNO: 1, CODEP: 1 }).lean();
    for (const r of rows) {
      if (r.ORDNO) values.add(upper(r.ORDNO));
      if (r.CODEP) values.add(upper(r.CODEP));
    }
  }
  return [...values];
}

async function findMargPurchaseBills(args: {
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  companyId: string;
  fyId: string;
  fyCode: string;
}) {
  const { vendorId, vendorCode, vendorName, companyId, fyId, fyCode } = args;
  const supplierCodes = await findSupplierCodes(vendorId, vendorCode, vendorName);
  const vendorRx = vendorName ? new RegExp(`^${esc(vendorName)}$`, "i") : null;

  const vendorOr: any[] = [];
  if (vendorRx) {
    vendorOr.push({ PARNAM: vendorRx }, { NAME: vendorRx });
  }
  for (const code of supplierCodes) {
    vendorOr.push({ CODEP: code });
  }

  if (!vendorOr.length) return [];

  const q: any = {
    TYPE: { $in: ["P", "PURCHASE"] },
    $or: vendorOr,
    ...metadataFilter(companyId, fyId, fyCode),
  };

  const rows = await SalesMdis.find(q, {
    VCN: 1, VOUCHER: 1, TYPE: 1, CODEP: 1, NAME: 1, PARNAM: 1,
    DATE: 1, DDATE: 1, FINAL: 1, NETAMT: 1, AMOUNT: 1, AMOUNTT: 1,
    companyId: 1, companyCode: 1, fyId: 1, fyCode: 1, _id: 1,
  }).sort({ DATE: 1, _id: 1 }).lean();

  return rows;
}

async function findPendingForBill(m: any) {
  const billNo = clean(m.VCN || m.VOUCHER);
  const codep = upper(m.CODEP);
  const ors: any[] = [];
  if (billNo && codep) {
    ors.push({ CODEP: codep, VCN: billNo }, { CODEP: codep, VOUCHER: billNo });
  }
  if (billNo) ors.push({ VCN: billNo }, { VOUCHER: billNo });
  if (!ors.length) return null;
  return Pendings.findOne({ $or: ors }).sort({ _id: -1 });
}

function mapBill(m: any, p: any) {
  const finalAmount = num(m.FINAL ?? m.NETAMT ?? m.AMOUNT ?? m.AMOUNTT);
  const pendingBalance = p ? num(p.BALANCE ?? p.FINAL ?? p.AMOUNT) : finalAmount;
  const balance = Math.max(0, pendingBalance);
  return {
    _id: String(m._id),
    source: "MDIS",
    pendingId: p?._id ? String(p._id) : "",
    billNumber: clean(m.VCN || m.VOUCHER),
    billDate: clean(m.DATE),
    dueDate: clean(m.DDATE || m.DATE),
    netAmount: finalAmount,
    paidAmount: Math.max(0, finalAmount - balance),
    balanceAmount: balance,
    vendorCode: clean(m.CODEP),
    vendorName: clean(m.PARNAM || m.NAME),
    mdisId: String(m._id),
    mdisCodep: clean(m.CODEP),
    mdisVoucher: clean(m.VOUCHER || m.VCN),
  };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "nextNumber") {
      return NextResponse.json({ success: true, nextVcn: await peekNextVoucherNumber("PAYMENT") });
    }

    if (action === "metrics") {
      const [paymentAgg, todayAgg, pendingAgg] = await Promise.all([
        GLedger.aggregate([
          { $match: { BOOK: "P", TYPE: "G", DEBIT: { $gt: 0 } } },
          { $group: { _id: "$VOUCHER", amount: { $sum: "$DEBIT" } } },
          { $group: { _id: null, totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        GLedger.aggregate([
          { $match: { BOOK: "P", TYPE: "G", DEBIT: { $gt: 0 }, DATE: todayStr() } },
          { $group: { _id: "$VOUCHER", amount: { $sum: "$DEBIT" } } },
          { $group: { _id: null, totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),
        Pendings.aggregate([
          { $match: { ACGROUP: "D", BALANCE: { $gt: 0 } } },
          { $group: { _id: null, totalPending: { $sum: "$BALANCE" }, count: { $sum: 1 } } },
        ]),
      ]);
      return NextResponse.json({
        success: true,
        totalPaymentsAmount: num(paymentAgg[0]?.totalAmount),
        totalPaymentsCount: num(paymentAgg[0]?.count),
        todayPaymentsAmount: num(todayAgg[0]?.totalAmount),
        todayPaymentsCount: num(todayAgg[0]?.count),
        totalPendingPayable: num(pendingAgg[0]?.totalPending),
        pendingBillsCount: num(pendingAgg[0]?.count),
      });
    }

    if (action === "vendorBills") {
      const vendorId = clean(searchParams.get("vendorId"));
      const vendorCode = clean(searchParams.get("vendorCode"));
      const vendorName = clean(searchParams.get("vendorName"));
      const companyId = clean(searchParams.get("companyId"));
      const fyId = clean(searchParams.get("fyId"));
      const fyCode = clean(searchParams.get("fyCode"));

      // AUTHORITATIVE BILL SOURCE = MDIS.
      // PENDINGS is joined to each MDIS bill when available. If a Marg import
      // did not create PENDINGS, the unpaid MDIS FINAL is still shown.
      const mdisBills = await findMargPurchaseBills({ vendorId, vendorCode, vendorName, companyId, fyId, fyCode });
      const bills = [];
      for (const m of mdisBills) {
        const p = await findPendingForBill(m);
        const b = mapBill(m, p);
        if (b.balanceAmount > 0) bills.push(b);
      }

      return NextResponse.json({ success: true, bills });
    }

    const search = clean(searchParams.get("search"));
    const vendorId = clean(searchParams.get("vendorId"));
    const companyId = clean(searchParams.get("companyId"));
    const fyId = clean(searchParams.get("fyId"));
    const fyCode = clean(searchParams.get("fyCode"));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const match: any = { BOOK: "P", TYPE: "G", DEBIT: { $gt: 0 } };
    if (companyId && companyId !== "ALL") match.companyId = companyId;
    if (fyId && fyId !== "ALL") match.fyId = fyId;
    else if (fyCode && fyCode !== "ALL") match.fyCode = new RegExp(`^${esc(fyCode)}$`, "i");
    if (vendorId) match.CODE = upper(vendorId);
    if (search) {
      const rx = new RegExp(esc(search), "i");
      match.$or = [{ VOUCHER: rx }, { CODE: rx }, { PARNAM: rx }, { NAME: rx }];
    }
    const [rows, total] = await Promise.all([
      GLedger.find(match).sort({ DATE: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      GLedger.countDocuments(match),
    ]);
    return NextResponse.json({
      success: true,
      payments: rows.map((r: any) => ({
        _id: String(r._id), voucherNo: clean(r.VOUCHER), paymentDate: clean(r.DATE),
        vendorName: clean(r.PARNAM || r.NAME || r.CODE), vendorCode: clean(r.CODE),
        paymentMode: clean(r.PAYMODE || r.REMARK2), refNo: clean(r.REFNO || r.REMARK1),
        bankName: clean(r.BANK), bankLedgerCode: clean(r.BANKCODE), amount: num(r.DEBIT), status: "Approved",
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error: any) {
    console.error("GET Purchase Payment Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

async function getOrCreatePending(m: any, companyId: string, companyCode: string, fyId: string, fyCode: string) {
  const existing = await findPendingForBill(m);
  if (existing) return existing;
  const billNo = clean(m.VCN || m.VOUCHER);
  const finalAmount = num(m.FINAL ?? m.NETAMT ?? m.AMOUNT ?? m.AMOUNTT);
  return Pendings.create({
    VCN: billNo,
    VOUCHER: clean(m.VOUCHER || m.VCN),
    TYPE: "P",
    ACGROUP: "D",
    CODEP: clean(m.CODEP),
    PARNAM: clean(m.PARNAM || m.NAME),
    NAME: clean(m.NAME || m.PARNAM),
    DATE: clean(m.DATE),
    DDATE: clean(m.DDATE || m.DATE),
    FINAL: finalAmount,
    AMOUNT: finalAmount,
    BALANCE: finalAmount,
    companyId,
    companyCode,
    fyId,
    fyCode,
    _vfpTable: "PENDINGS_F18",
    _vfpSourceKey: `PURCHASE_PENDING_${billNo}_${clean(m.CODEP)}`,
  });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const paymentDate = clean(body.paymentDate) || todayStr();
    const companyId = clean(body.companyId);
    const companyCode = clean(body.companyCode);
    const fyId = clean(body.fyId);
    const fyCode = clean(body.fyCode);
    const vendorId = clean(body.vendorId);
    const vendorCode = clean(body.vendorCode);
    const vendorName = clean(body.vendorName);
    const payAmount = num(body.amount);

    if (!vendorName) return NextResponse.json({ success: false, message: "Vendor/Supplier name is required" }, { status: 400 });
    if (payAmount <= 0) return NextResponse.json({ success: false, message: "Payment amount must be greater than 0" }, { status: 400 });

    const voucherNo = await consumeNextVoucherNumber("PAYMENT");
    const provided = Array.isArray(body.settledBills) ? body.settledBills.filter((x: any) => num(x.settledAmount) > 0) : [];
    const cleanedSettledBills: any[] = [];
    let remainingToAllocate = payAmount;

    let mdisBills = await findMargPurchaseBills({ vendorId, vendorCode, vendorName, companyId, fyId, fyCode });

    if (provided.length) {
      for (const sb of provided) {
        const billNo = clean(sb.billNumber);
        const m = mdisBills.find((x: any) => clean(x.VCN || x.VOUCHER) === billNo) ||
          await SalesMdis.findOne({ $or: [{ VCN: billNo }, { VOUCHER: billNo }] }).lean();
        if (!m) continue;
        const p = await getOrCreatePending(m, companyId, companyCode, fyId, fyCode);
        const cur = num((p as any).BALANCE ?? (p as any).FINAL ?? 0);
        const setAmt = Math.min(cur, num(sb.settledAmount));
        if (setAmt <= 0) continue;
        (p as any).BALANCE = Math.max(0, cur - setAmt);
        await (p as any).save();
        cleanedSettledBills.push({ billId: String(m._id), billNumber: billNo, originalAmount: num(m.FINAL ?? m.NETAMT), settledAmount: setAmt, remainingAmount: Math.max(0, cur - setAmt) });
        remainingToAllocate -= setAmt;
      }
    } else {
      for (const m of mdisBills) {
        if (remainingToAllocate <= 0) break;
        const p = await getOrCreatePending(m, companyId, companyCode, fyId, fyCode);
        const cur = num((p as any).BALANCE ?? (p as any).FINAL ?? 0);
        if (cur <= 0) continue;
        const setAmt = Math.min(cur, remainingToAllocate);
        (p as any).BALANCE = Math.max(0, cur - setAmt);
        await (p as any).save();
        cleanedSettledBills.push({ billId: String(m._id), billNumber: clean(m.VCN || m.VOUCHER), originalAmount: num(m.FINAL ?? m.NETAMT), settledAmount: setAmt, remainingAmount: Math.max(0, cur - setAmt) });
        remainingToAllocate -= setAmt;
      }
    }

    const paymentVoucher = await PurchasePayment.create({
      voucherNo, paymentDate, companyId, companyCode, fyId, fyCode,
      vendorId, vendorCode, vendorName,
      vendorGst: clean(body.vendorGst), vendorPhone: clean(body.vendorPhone), vendorCity: clean(body.vendorCity),
      amount: payAmount, paymentMode: clean(body.paymentMode) || "Bank Transfer", refNo: clean(body.refNo),
      bankName: clean(body.bankName), discountReceived: num(body.discountReceived),
      settledBills: cleanedSettledBills, remarks: clean(body.remarks), status: "Approved", createdBy: "Admin",
    });

    const paymentMode = upper(body.paymentMode);
    const bankCode = clean(body.bankLedgerCode) || (upper(body.bankName).includes("HDFC") ? "#6123" : "");
    const supplierGroup = await (async () => {
      const code = upper(vendorCode || vendorId);
      if (!code) return "D";
      const row = await Order.findOne({ ORDNO: code }, { SCODE: 1 }).lean();
      return upper((row as any)?.SCODE) || "D";
    })();

    // Marg payment: DR supplier, CR bank/cash. Keep both rows in GLEDGER.
    await GLedger.create({
      VOUCHER: voucherNo, VCN: voucherNo, BOOK: "P", TYPE: "G", CODE: upper(vendorCode || vendorId),
      GCODE: supplierGroup, PARNAM: vendorName, NAME: vendorName, DATE: paymentDate, DDATE: paymentDate,
      DEBIT: payAmount, CREDIT: 0, AMOUNT: payAmount, DR: "D", CR: "", PAYMODE: clean(body.paymentMode), REFNO: clean(body.refNo),
      BANK: clean(body.bankName), NARRATION: clean(body.remarks) || `Payment against purchase bills`,
      companyId, companyCode, fyId, fyCode, _vfpTable: "gledger", _vfpSourceKey: `P_${voucherNo}_DR`,
    });

    if (bankCode) {
      await GLedger.create({
        VOUCHER: voucherNo, VCN: voucherNo, BOOK: "P", TYPE: "G", CODE: upper(bankCode),
        GCODE: paymentMode === "CASH" ? "C2" : "C1", PARNAM: clean(body.bankName) || paymentMode,
        NAME: clean(body.bankName) || paymentMode, DATE: paymentDate, DDATE: paymentDate,
        DEBIT: 0, CREDIT: payAmount, AMOUNT: payAmount, DR: "", CR: "C", PAYMODE: clean(body.paymentMode), REFNO: clean(body.refNo),
        BANK: clean(body.bankName), NARRATION: clean(body.remarks) || `Purchase payment ${voucherNo}`,
        companyId, companyCode, fyId, fyCode, _vfpTable: "gledger", _vfpSourceKey: `P_${voucherNo}_CR`,
      });
    }

    return NextResponse.json({ success: true, message: "Payment Voucher created successfully", paymentVoucher });
  } catch (error: any) {
    console.error("POST Purchase Payment Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ success: false, message: "Payment deletion is disabled until Marg reversal logic is implemented." }, { status: 409 });
}
