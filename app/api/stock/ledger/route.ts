import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StockMovement from "@/models/StockMovement";
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
    const productCode = clean(searchParams.get("productCode"));
    const batchNo = clean(searchParams.get("batchNo"));
    const type = clean(searchParams.get("type"));
    const from = clean(searchParams.get("from"));
    const to = clean(searchParams.get("to"));
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") || 100)));

    if (!companyId || !fyId) return NextResponse.json({ success: false, message: "companyId and fyId are required" }, { status: 400 });

    const query: any = { companyId, fyId };
    if (productCode) query.productCode = productCode;
    if (batchNo) query.batchNo = batchNo;
    if (type) query.type = type;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
    }

    const [movements, total, summary] = await Promise.all([
      StockMovement.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      StockMovement.countDocuments(query),
      StockMovement.aggregate([
        { $match: query },
        { $group: { _id: null, netQty: { $sum: "$quantity" }, inQty: { $sum: { $cond: [{ $gt: ["$quantity", 0] }, "$quantity", 0] } }, outQty: { $sum: { $cond: [{ $lt: ["$quantity", 0] }, { $abs: "$quantity" }, 0] } } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      movements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      summary: summary[0] || { netQty: 0, inQty: 0, outQty: 0 },
    });
  } catch (error: any) {
    console.error("GET stock ledger error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Server error" }, { status: 500 });
  }
}
