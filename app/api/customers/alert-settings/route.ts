import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CustomerAlertConfig from "@/models/CustomerAlertConfig";
import {
  getCustomerAlertSchedulerStatus,
  restartCustomerAlertScheduler,
  startCustomerAlertScheduler,
  sendTestEmailToAdmin,
} from "@/lib/services/customerAlertScheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    let config = await CustomerAlertConfig.findOne({ tenantId: "TENANT001" }).lean();

    if (!config) {
      config = await CustomerAlertConfig.create({
        tenantId: "TENANT001",
        enabled: true,
        daysRemainingThreshold: 3,
        billCountThreshold: 5,
        creditLimitPercentage: 100,
        autoDispatchEmail: true,
        autoDispatchWhatsApp: false,
        schedulerEnabled: true,
        scheduleFrequency: "every_15_mins",
        scheduledTime: "09:00",
        cooldownHours: 24,
        adminNotificationEmail: "",
      });
    }

    // Ensure scheduler is active if enabled
    if (config.enabled && config.schedulerEnabled !== false) {
      startCustomerAlertScheduler().catch((e) =>
        console.warn("[Alert Settings] Auto start scheduler failed:", e)
      );
    }

    const schedulerStatus = getCustomerAlertSchedulerStatus();

    return NextResponse.json({
      success: true,
      config,
      schedulerStatus,
    });
  } catch (err: any) {
    console.error("GET /api/customers/alert-settings error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    // Check for instant test email trigger
    if (body.action === "test_email") {
      const testEmail = String(body.email || "").trim();
      if (!testEmail || !testEmail.includes("@")) {
        return NextResponse.json(
          { success: false, message: "Please provide a valid email address for testing." },
          { status: 400 }
        );
      }
      const result = await sendTestEmailToAdmin(testEmail);
      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Test alert email sent successfully to ${testEmail}`
          : (result.error || "Failed to deliver email through GoDaddy SMTP"),
        details: result,
      });
    }

    const updates = {
      enabled: body.enabled !== undefined ? !!body.enabled : true,
      daysRemainingThreshold: Number(body.daysRemainingThreshold ?? 3),
      billCountThreshold: Number(body.billCountThreshold ?? 5),
      creditLimitPercentage: Number(body.creditLimitPercentage ?? 100),
      autoDispatchEmail: body.autoDispatchEmail !== undefined ? !!body.autoDispatchEmail : true,
      autoDispatchWhatsApp: body.autoDispatchWhatsApp !== undefined ? !!body.autoDispatchWhatsApp : false,
      adminNotificationEmail: String(body.adminNotificationEmail || "").trim(),
      metaPhoneNumberId: String(body.metaPhoneNumberId || "").trim(),
      metaAccessToken: String(body.metaAccessToken || "").trim(),
      schedulerEnabled: body.schedulerEnabled !== undefined ? !!body.schedulerEnabled : true,
      scheduleFrequency: ["daily", "hourly", "every_6_hours", "every_15_mins"].includes(body.scheduleFrequency)
        ? body.scheduleFrequency
        : "every_15_mins",
      scheduledTime: String(body.scheduledTime || "09:00").trim(),
      cooldownHours: Number(body.cooldownHours ?? 24),
    };

    const config = await CustomerAlertConfig.findOneAndUpdate(
      { tenantId: "TENANT001" },
      { $set: updates },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    // Restart the background scheduler to apply the new schedule frequency and rules immediately
    if (updates.enabled && updates.schedulerEnabled) {
      await restartCustomerAlertScheduler();
    }

    const schedulerStatus = getCustomerAlertSchedulerStatus();

    return NextResponse.json({
      success: true,
      message: "Customer alert automation rules and scheduler saved successfully",
      config,
      schedulerStatus,
    });
  } catch (err: any) {
    console.error("POST /api/customers/alert-settings error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

