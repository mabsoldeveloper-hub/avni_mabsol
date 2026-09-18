import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import OrderTracking from "@/models/OrderTracking";
import { NotificationGatewayService } from "@/lib/services/notificationGateway.service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const order = await OrderTracking.findOne({ $or: [{ _id: id }, { orderId: id }, { orderNumber: id }] });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order tracking record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const {
      status,
      courierPartner,
      trackingNumber,
      dispatchNotes,
      estimatedDeliveryDate,
      updatedBy = "Admin / Logistics",
      location,
      triggerNotification = true,
    } = body;

    const order = await OrderTracking.findOne({ $or: [{ _id: id }, { orderId: id }, { orderNumber: id }] });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order tracking record not found" }, { status: 404 });
    }

    // Update fields
    if (status) order.currentStatus = status;
    if (courierPartner !== undefined) order.courierPartner = courierPartner;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (dispatchNotes !== undefined) order.dispatchNotes = dispatchNotes;
    if (estimatedDeliveryDate) order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);

    if (status === "Dispatched" && !order.dispatchedDate) {
      order.dispatchedDate = new Date();
    }
    if (status === "Delivered" && !order.deliveredDate) {
      order.deliveredDate = new Date();
    }

    // Append Milestone Progression
    if (status) {
      order.milestones.push({
        stage: status,
        timestamp: new Date(),
        updatedBy,
        notes: dispatchNotes || `Status updated to ${status}`,
        location: location || "",
      });
    }

    await order.save();

    // Trigger Automated Multi-Channel Notification
    if (triggerNotification) {
      if (status === "Dispatched") {
        await NotificationGatewayService.sendOrderMilestoneNotification({
          orderTracking: order,
          event: "DISPATCHED",
        });
      } else if (status === "Delivered") {
        await NotificationGatewayService.sendOrderMilestoneNotification({
          orderTracking: order,
          event: "DELIVERED",
        });
      }
    }

    return NextResponse.json({
      success: true,
      order,
      message: `Order status updated to ${status} and buyer notified!`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
