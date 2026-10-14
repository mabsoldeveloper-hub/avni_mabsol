import { NextResponse } from "next/server";
import OrderTracking from "@/models/OrderTracking";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const salespersonId = searchParams.get("salespersonId");
    const areaName = searchParams.get("areaName");
    const customerCode = searchParams.get("customerCode");

    const query: any = {};
    if (user.tenantId) query.tenantId = user.tenantId;
    if (status && status !== "ALL") query.currentStatus = status;
    if (salespersonId) query.salespersonId = salespersonId;
    if (areaName && areaName !== "ALL") query.areaName = areaName;
    if (customerCode) query.customerCode = customerCode;

    const orders = await OrderTracking.find(query).sort({ orderDate: -1 }).limit(100).lean();

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      areaName,
      items = [],
      totalAmount = 0,
      salespersonName,
    } = body;

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const newOrder = await OrderTracking.create({
      tenantId: user.tenantId || "TENANT001",
      orderId,
      orderNumber: orderNumber || `PO-${Date.now().toString().slice(-5)}`,
      customerName,
      customerPhone,
      customerEmail,
      areaName,
      salespersonName: salespersonName || user.name || "Sales Operator",
      totalAmount,
      itemCount: items.length,
      items: items.map((it: any) => ({
        ...it,
        stockAfter: Math.max(0, (it.stockBefore || 100) - (it.quantityOrdered || 1)),
      })),
      currentStatus: "Ordered",
      milestones: [
        {
          stage: "Ordered",
          timestamp: new Date(),
          updatedBy: salespersonName || user.name || "Sales Operator",
          notes: "New stock order created",
        },
      ],
    });

    return NextResponse.json({ success: true, order: newOrder, message: "Order created and stock tracking initiated" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
