import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StockBalance from "@/models/StockBalance";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
const clean = (v: any) => String(v ?? "").trim();

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user: any = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const companyId = clean(searchParams.get("companyId") || user.companyId?._id || user.companyId);
    const fyId = clean(searchParams.get("fyId"));
    const search = clean(searchParams.get("search") || searchParams.get("q"));
    const batch = clean(searchParams.get("batchNo"));
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") || 50)));

    if (!companyId || !fyId) return NextResponse.json({ success: false, message: "companyId and fyId are required" }, { status: 400 });

    const query: any = { companyId, fyId };
    if (batch) query.batchNo = batch;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [{ productCode: regex }, { productName: regex }, { batchNo: regex }];
    }

    const [items, total, summary] = await Promise.all([
      StockBalance.find(query).sort({ productName: 1, batchNo: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      StockBalance.countDocuments(query),
      StockBalance.aggregate([
        { $match: query },
        { $group: { _id: null, totalQty: { $sum: "$currentQty" }, totalValue: { $sum: { $multiply: ["$currentQty", "$rate"] } }, products: { $addToSet: "$productCode" } } },
      ]),
    ]);

    const rows = items.map((x: any) => ({
      ...x,
      id: String(x._id),
      balance: Number(x.currentQty || 0),
      stockValue: Number(x.currentQty || 0) * Number(x.rate || x.mrp || 0),
      status: Number(x.currentQty || 0) <= 0 ? "out_of_stock" : "in_stock",
    }));

    return NextResponse.json({
      success: true,
      items: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      summary: {
        totalStockQty: Number(summary[0]?.totalQty || 0),
        totalStockValue: Number(summary[0]?.totalValue || 0),
        productCount: summary[0]?.products?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("GET current stock error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server error" }, { status: 500 });
  }
}
