import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AgentPin from "@/models/AgentPin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const pin = (searchParams.get("pin") || "").trim();
    const deviceId = (searchParams.get("deviceId") || request.headers.get("x-device-id") || "").trim();

    if (!pin && !deviceId) {
      return NextResponse.json(
        { success: false, error: "PIN or Device ID is required." },
        { status: 400 }
      );
    }

    const query: any = {};
    if (pin) query.pin = pin;
    if (deviceId) query.deviceId = deviceId;

    const record = await AgentPin.findOne(query).sort({ createdAt: -1 });

    if (!record) {
      return NextResponse.json({
        success: false,
        status: "not_found",
        message: "No PIN record found for this device.",
      });
    }

    const now = new Date();
    if (record.status === "pending" && now > new Date(record.expiresAt)) {
      record.status = "expired";
      await record.save();
      return NextResponse.json({
        success: false,
        status: "expired",
        message: "Agent PIN has expired. Please generate a new PIN.",
      });
    }

    if (record.status === "activated") {
      const cleanComp = (val?: string) => {
        if (!val) return "";
        const lower = val.trim().toLowerCase();
        if (lower === "default" || lower === "organization" || lower === "your organization" || lower === "test") return "";
        return val.trim();
      };

      return NextResponse.json({
        success: true,
        status: "activated",
        licenseKey: record.licenseKey,
        companyName: cleanComp(record.companyName),
        companyCode: cleanComp(record.companyCode),
        deviceId: record.deviceId,
        deviceName: record.deviceName,
        expiresAt: record.licenseExpiresAt || record.expiresAt,
        licenseExpiresAt: record.licenseExpiresAt || record.expiresAt,
        daysRemaining: record.licenseExpiresAt
          ? Math.max(0, Math.ceil((new Date(record.licenseExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 30,
        activatedAt: record.activatedAt,
        message: "Agent PIN successfully verified and authorized from Web CRM!",
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((new Date(record.expiresAt).getTime() - now.getTime()) / 1000));

    return NextResponse.json({
      success: true,
      status: "pending",
      remainingSeconds,
      pin: record.pin,
      deviceId: record.deviceId,
      message: "Waiting for user to enter PIN on Web Dashboard...",
    });
  } catch (err: any) {
    console.error("[Agent Pin Status Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to check PIN status." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
