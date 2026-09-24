import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import NotificationGatewayConfig from "@/models/NotificationGatewayConfig";
import { NotificationGatewayService } from "@/lib/services/notificationGateway.service";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || "TENANT001";
    const companyId = searchParams.get("companyId") || "";

    let config = await NotificationGatewayConfig.findOne({
      tenantId,
      ...(companyId ? { companyId } : {}),
    });

    if (!config) {
      config = await NotificationGatewayConfig.create({
        tenantId,
        companyId,
      });
    }

    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { tenantId = "TENANT001", companyId = "", action, testRecipient, channel, ...settings } = body;

    // Handle Live Connection Test
    if (action === "TEST_CONNECTION") {
      if (!testRecipient) {
        return NextResponse.json({ success: false, error: "Test recipient is required" }, { status: 400 });
      }

      if (channel === "whatsapp") {
        const res = await NotificationGatewayService.sendWhatsApp({
          to: testRecipient,
          message: "🧪 *MabsolCrm*: WhatsApp Gateway connection test successful! ✅",
          config: settings as any,
        });
        return NextResponse.json(res);
      } else if (channel === "email") {
        const res = await NotificationGatewayService.sendEmail({
          to: testRecipient,
          subject: "🧪 MabsolCrm Email Gateway Test",
          html: "<div style='font-family: Arial; padding: 15px;'><h3>✅ Test Email Successful</h3><p>Your SMTP/Email settings are configured properly in MabsolCrm.</p></div>",
          config: settings as any,
        });
        return NextResponse.json(res);
      } else if (channel === "sms") {
        const res = await NotificationGatewayService.sendSms({
          to: testRecipient,
          message: "MABSOL: SMS Gateway connection test successful! ✅",
          config: settings as any,
        });
        return NextResponse.json(res);
      }
    }

    // Save Settings
    const updated = await NotificationGatewayConfig.findOneAndUpdate(
      { tenantId, ...(companyId ? { companyId } : {}) },
      { $set: settings },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, config: updated, message: "Settings saved successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
