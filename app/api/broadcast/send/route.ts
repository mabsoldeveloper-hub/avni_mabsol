import { NextResponse } from "next/server";
import User from "@/models/User";
import Customer from "@/models/Customer";
import BroadcastMessage from "@/models/BroadcastMessage";
import { NotificationGatewayService } from "@/lib/services/notificationGateway.service";
import { connectDB } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      title,
      messageBody,
      channels = ["whatsapp", "email", "sms", "inApp"],
      targetRoles = ["All"],
      targetAreaIds = [],
      targetAreaNames = [],
      companyId = "",
      senderName = "Admin",
    } = body;

    if (!title || !messageBody) {
      return NextResponse.json({ success: false, error: "Title and message body are required" }, { status: 400 });
    }

    // 1. Resolve Target Audience
    const recipientMap = new Map<string, { id?: string; name: string; role: string; area: string; phone: string; email: string }>();

    // A. Query Users if targeting internal roles (MR, RSM, ZSM, Manager, Admin, All)
    const isTargetingUsers = targetRoles.includes("All") || targetRoles.some((r: string) => !["Customer", "Chemist", "Stockist"].includes(r));
    if (isTargetingUsers) {
      const userQuery: any = { status: "Active" };
      if (!targetRoles.includes("All")) {
        userQuery.$or = [
          { roleName: { $in: targetRoles } },
          { roleType: { $in: targetRoles } },
        ];
      }
      if (targetAreaIds.length > 0) {
        userQuery.assignedAreaIds = { $in: targetAreaIds };
      }

      const users = await User.find(userQuery).lean();
      users.forEach((u: any) => {
        const key = u.email || u.mobile || String(u._id);
        recipientMap.set(key, {
          id: String(u._id),
          name: u.name || "User",
          role: u.roleName || u.roleType || "Salesman",
          area: (u.assignedAreaNames || []).join(", ") || u.headquarter || "All",
          phone: u.mobile || "",
          email: u.email || "",
        });
      });
    }

    // B. Query Customers if targeting Customers/Chemists
    const isTargetingCustomers = targetRoles.includes("All") || targetRoles.some((r: string) => ["Customer", "Chemist", "Stockist"].includes(r));
    if (isTargetingCustomers) {
      try {
        const custQuery: any = {};
        if (targetAreaNames.length > 0) {
          custQuery.area = { $in: targetAreaNames };
        }
        const customers = await Customer.find(custQuery).limit(500).lean();
        customers.forEach((c: any) => {
          const key = c.email || c.phone || c.mobile || String(c._id);
          recipientMap.set(key, {
            id: String(c._id),
            name: c.name || c.partyName || "Customer",
            role: "Customer",
            area: c.area || c.city || "General",
            phone: c.phone || c.mobile || "",
            email: c.email || "",
          });
        });
      } catch (e) {
        console.warn("Customer lookup fallback:", e);
      }
    }

    const recipients = Array.from(recipientMap.values());
    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "No recipients matched the selected role and area filters." },
        { status: 400 }
      );
    }

    // 2. Fetch Gateway Config
    const config = await NotificationGatewayService.getConfig("TENANT001", companyId);

    // 3. Dispatch Multi-Channel Broadcast
    let sentCount = 0;
    let failedCount = 0;
    const recipientLogs: any[] = [];

    for (const r of recipients) {
      // Personalize message with placeholders
      const personalizedMsg = messageBody
        .replace(/\{name\}/gi, r.name)
        .replace(/\{area\}/gi, r.area)
        .replace(/\{role\}/gi, r.role);

      const logItem: any = {
        recipientId: r.id,
        recipientName: r.name,
        recipientRole: r.role,
        recipientArea: r.area,
        phone: r.phone,
        email: r.email,
        channels: {},
      };

      let recipientSuccess = false;

      // WhatsApp
      if (channels.includes("whatsapp") && r.phone) {
        const res = await NotificationGatewayService.sendWhatsApp({
          to: r.phone,
          message: `📢 *${title}*\n\n${personalizedMsg}`,
          config,
        });
        logItem.channels.whatsapp = {
          status: res.success ? "sent" : "failed",
          error: res.error,
          messageId: res.messageId,
          sentAt: new Date(),
        };
        if (res.success) recipientSuccess = true;
      }

      // Email
      if (channels.includes("email") && r.email) {
        const res = await NotificationGatewayService.sendEmail({
          to: r.email,
          subject: title,
          html: `<div style="font-family: Arial, sans-serif; padding: 18px; border: 1px solid #e2e8f0; border-radius: 10px;">
                  <h3 style="color: #4f46e5; margin-top: 0;">${title}</h3>
                  <p>Hello <strong>${r.name}</strong>,</p>
                  <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${personalizedMsg}</div>
                  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <p style="font-size: 11px; color: #94a3b8;">Sent via MabsolCrm Broadcast</p>
                </div>`,
          config,
        });
        logItem.channels.email = {
          status: res.success ? "sent" : "failed",
          error: res.error,
          messageId: res.messageId,
          sentAt: new Date(),
        };
        if (res.success) recipientSuccess = true;
      }

      // SMS
      if (channels.includes("sms") && r.phone) {
        const res = await NotificationGatewayService.sendSms({
          to: r.phone,
          message: `${title}: ${personalizedMsg.slice(0, 140)}`,
          config,
        });
        logItem.channels.sms = {
          status: res.success ? "sent" : "failed",
          error: res.error,
          messageId: res.messageId,
          sentAt: new Date(),
        };
        if (res.success) recipientSuccess = true;
      }

      // In-App Notification
      if (channels.includes("inApp")) {
        await NotificationGatewayService.sendInApp({
          userId: r.id,
          targetRole: r.role,
          title,
          message: personalizedMsg,
          actionUrl: "/dashboard",
        });
        logItem.channels.inApp = {
          status: "sent",
          sentAt: new Date(),
        };
        recipientSuccess = true;
      }

      if (recipientSuccess) {
        sentCount++;
      } else {
        failedCount++;
      }

      recipientLogs.push(logItem);
    }

    // 4. Save Broadcast Campaign Record
    const broadcastRecord = await BroadcastMessage.create({
      tenantId: "TENANT001",
      companyId,
      title,
      messageBody,
      channels,
      targetRoles,
      targetAreaIds,
      targetAreaNames,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      status: failedCount === recipients.length ? "failed" : "completed",
      recipientLogs,
      senderName,
    });

    return NextResponse.json({
      success: true,
      broadcastId: broadcastRecord._id,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      message: `Broadcast dispatched successfully to ${sentCount} recipients!`,
    });
  } catch (err: any) {
    console.error("Broadcast Send Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const broadcasts = await BroadcastMessage.find().sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ success: true, broadcasts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
