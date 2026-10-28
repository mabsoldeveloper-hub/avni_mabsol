import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import AgentPin from "@/models/AgentPin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const deviceId = (body.deviceId || request.headers.get("x-device-id") || "").trim();
    const deviceName = (body.deviceName || request.headers.get("x-device-name") || "Desktop Agent").trim();
    const agentEmail = (body.agentEmail || body.email || "").trim().toLowerCase();

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "Device identifier is required." },
        { status: 400 }
      );
    }

    // Clean up any stale or previous pending pins for this machine
    await AgentPin.deleteMany({
      deviceId,
      status: "pending",
    });

    // Generate random 6-digit PIN (100000 - 999999)
    const pin = crypto.randomInt(100000, 999999).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

    const agentPin = await AgentPin.create({
      pin,
      deviceId,
      deviceName: deviceName || "Desktop Agent",
      agentEmail: agentEmail || undefined,
      status: "pending",
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      pin: agentPin.pin,
      expiresAt: agentPin.expiresAt.toISOString(),
      validitySeconds: 900,
      deviceId,
      deviceName,
      message: "6-Digit Agent PIN generated successfully. Enter this PIN in your Web CRM to authorize this machine.",
    });
  } catch (err: any) {
    console.error("[Agent Pin Request Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate Agent PIN." },
      { status: 500 }
    );
  }
}
