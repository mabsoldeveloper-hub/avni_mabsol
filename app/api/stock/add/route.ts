import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { getCurrentUser } from "@/lib/auth";
import { applyStockMovement } from "@/lib/stockService";

export const dynamic = "force-dynamic";
const clean = (v: any) => String(v ?? "").trim();

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user: any = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const companyId = clean(body.companyId || user.companyId?._id || user.companyId);
    const fyId = clean(body.fyId);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!companyId || !fyId) return NextResponse.json({ success: false, message: "Company and Financial Year are required" }, { status: 400 });
    if (!items.length) return NextResponse.json({ success: false, message: "At least one stock item is required" }, { status: 400 });

    const results: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const productCode = clean(raw.productCode || raw.code);
      const qty = Number(raw.quantity ?? raw.qty ?? 0);
      if (!productCode || !Number.isFinite(qty) || qty <= 0) continue;

      const product: any = await Product.findOne({
        $or: [
          { CODE: productCode }, { PRODUCT: productCode }, { CODEP: productCode }, { NAME: productCode },
          ...(!isNaN(Number(productCode)) ? [{ CODE: Number(productCode) }] : []),
        ],
      }).lean();

      const result = await applyStockMovement({
        companyId,
        companyCode: clean(body.companyCode),
        fyId,
        fyCode: clean(body.fyCode),
        productId: clean(raw.productId || product?._id),
        productCode,
        productName: clean(raw.productName || raw.name || product?.PRODUCT || product?.NAME),
        batchNo: clean(raw.batchNo || raw.batch),
        expiry: clean(raw.expiry || raw.expDate || product?.EXP),
        mfgDate: clean(raw.mfgDate || raw.mfd),
        quantity: qty,
        type: "STOCK_IN",
        referenceType: "MANUAL_STOCK_IN",
        referenceNo: clean(body.referenceNo || `STK-${Date.now()}`),
        referenceKey: `MANUAL_STOCK_IN:${companyId}:${fyId}:${clean(body.referenceNo || "")}:${i}:${Date.now()}`,
        rate: Number(raw.rate || product?.PRATE || product?.LPRATE || 0),
        mrp: Number(raw.mrp || product?.MRP || 0),
        remarks: clean(raw.remarks || body.remarks || "Manual stock entry"),
        createdBy: clean(user._id),
      });
      results.push(result);
    }

    return NextResponse.json({ success: true, message: "Stock added successfully", count: results.length, results });
  } catch (error: any) {
    console.error("POST add stock error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server error" }, { status: 400 });
  }
}
