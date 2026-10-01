import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import { getCurrentUser } from "@/lib/auth";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const deviceId = (body.deviceId || "").trim();
    let email = (body.email || body.userEmail || "").trim().toLowerCase();
    const licenseKey = (body.licenseKey || request.headers.get("x-license-key") || "").trim();

    if (!deviceId) {
      return NextResponse.json({ success: false, error: "Device ID is required." }, { status: 400 });
    }

    // Authenticate user
    const user = await getCurrentUser();
    if (user?.email) {
      email = email || user.email.toLowerCase().trim();
    } else {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7).trim();
          const payload = jwt.verify(token, process.env.JWT_SECRET || "MabsolCRM@2026SecretKey") as any;
          if (payload?.email) {
            email = email || payload.email.toLowerCase().trim();
          }
        } catch {}
      }
    }

    const cleanDevId = deviceId.toLowerCase();
    const queryConditions: any[] = [];
    if (licenseKey) queryConditions.push({ license: licenseKey });
    if (email) {
      queryConditions.push({ email });
      queryConditions.push({ key: "vfp_sync_config_" + email });
    }
    queryConditions.push({ key: "vfp_sync_config" });

    // Pull the device from authorizedDevices across all related configs
    await VfpConfig.updateMany(
      { $or: queryConditions },
      {
        $pull: {
          authorizedDevices: {
            deviceId: { $regex: new RegExp(`^${cleanDevId}$`, "i") }
          }
        }
      }
    );

    // If boundDeviceId matched this device, clear it
    await VfpConfig.updateMany(
      {
        $or: queryConditions,
        boundDeviceId: { $regex: new RegExp(`^${cleanDevId}$`, "i") }
      },
      {
        $set: {
          boundDeviceId: "",
          boundDeviceName: "",
          boundAt: null
        }
      }
    );

    // Fetch updated config
    const updated: any = await VfpConfig.findOne({ $or: queryConditions }).lean();
    const authorizedDevices = Array.isArray(updated?.authorizedDevices) ? updated.authorizedDevices : [];

    return NextResponse.json({
      success: true,
      message: `Machine access revoked successfully.`,
      authorizedDevices
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to revoke device." }, { status: 500 });
  }
}
