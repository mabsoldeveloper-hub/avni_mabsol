import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import StockMovement from "@/models/StockMovement";
import StockBalance from "@/models/StockBalance";
import { getCurrentUser } from "@/lib/auth";
import { replaceOpeningStock } from "@/lib/stockService";

export const dynamic = "force-dynamic";

const clean = (v: any) => String(v ?? "").trim();

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user: any = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const companyId = clean(searchParams.get("companyId"));
    const fyId = clean(searchParams.get("fyId"));
    const search = clean(searchParams.get("search"));

    if (!companyId || !fyId) {
      return NextResponse.json({ success: false, message: "companyId and fyId are required" }, { status: 400 });
    }

    const balanceQuery: any = { companyId, fyId };
    if (search) {
      balanceQuery.$or = [
        { productCode: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { productName: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { batchNo: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      ];
    }

    const [balances, openings] = await Promise.all([
      StockBalance.find(balanceQuery).sort({ productName: 1, batchNo: 1 }).limit(500).lean(),
      StockMovement.find({ companyId, fyId, type: "OPENING" }).sort({ createdAt: -1 }).limit(1000).lean(),
    ]);

    return NextResponse.json({ success: true, balances, openings });
  } catch (error: any) {
    console.error("GET opening stock error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user: any = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const companyId = clean(body.companyId || user.companyId?._id || user.companyId);
    const fyId = clean(body.fyId);
    const companyCode = clean(body.companyCode);
    const fyCode = clean(body.fyCode);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!companyId || !fyId) {
      return NextResponse.json({ success: false, message: "Company and Financial Year are required" }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json({ success: false, message: "At least one opening stock item is required" }, { status: 400 });
    }

    const results: any[] = [];
    for (const raw of items) {
      const productCode = clean(raw.productCode || raw.code);
      if (!productCode) continue;

      const product: any = await Product.findOne({
        $or: [
          { CODE: productCode },
          { PRODUCT: productCode },
          { CODEP: productCode },
          { NAME: productCode },
          ...(!isNaN(Number(productCode)) ? [{ CODE: Number(productCode) }] : []),
        ],
      }).lean();

      const quantity = Math.max(0, Number(raw.quantity ?? raw.qty ?? 0));
      if (!Number.isFinite(quantity)) continue;

      const result = await replaceOpeningStock({
        companyId,
        companyCode,
        fyId,
        fyCode,
        productId: clean(raw.productId || product?._id),
        productCode,
        productName: clean(raw.productName || raw.name || product?.PRODUCT || product?.NAME),
        batchNo: clean(raw.batchNo || raw.batch),
        expiry: clean(raw.expiry || raw.expDate || product?.EXP),
        mfgDate: clean(raw.mfgDate || raw.mfd),
        quantity,
        rate: Number(raw.rate || raw.prate || product?.PRATE || product?.LPRATE || 0),
        mrp: Number(raw.mrp || product?.MRP || 0),
        referenceNo: clean(body.referenceNo || "OPENING"),
        createdBy: clean(user._id),
        remarks: clean(raw.remarks || body.remarks || "Opening stock entry"),
      });
      results.push(result);
    }

    return NextResponse.json({
      success: true,
      message: "Opening stock saved successfully",
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error("POST opening stock error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server error" }, { status: 500 });
  }
}
