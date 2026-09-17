import { NextResponse } from "next/server";
import OrderTracking from "@/models/OrderTracking";
import { NotificationGatewayService } from "@/lib/services/notificationGateway.service";
import { connectDB } from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const salespersonId = searchParams.get("salespersonId");
    const areaName = searchParams.get("areaName");
    const customerCode = searchParams.get("customerCode");

    const query: any = {};
    if (status && status !== "ALL") query.currentStatus = status;
    if (salespersonId) query.salespersonId = salespersonId;
    if (areaName && areaName !== "ALL") query.areaName = areaName;
    if (customerCode) query.customerCode = customerCode;

    let orders = await OrderTracking.find(query).sort({ orderDate: -1 }).limit(100).lean();

    // If no tracked orders exist yet, seed a few realistic demo orders so the tracker works instantly
    if (orders.length === 0 && (!status || status === "ALL") && !salespersonId) {
      const demoOrders: any[] = [];
      if (demoOrders.length > 0) {
        await OrderTracking.insertMany(demoOrders);
        orders = await OrderTracking.find(query).sort({ orderDate: -1 }).lean();
      }
    }

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
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
      tenantId: "TENANT001",
      orderId,
      orderNumber: orderNumber || `PO-${Date.now().toString().slice(-5)}`,
      customerName,
      customerPhone,
      customerEmail,
      areaName,
      salespersonName,
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
          updatedBy: salespersonName || "Sales Operator",
          notes: "New stock order created",
        },
      ],
    });

    return NextResponse.json({ success: true, order: newOrder, message: "Order created and stock tracking initiated" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
