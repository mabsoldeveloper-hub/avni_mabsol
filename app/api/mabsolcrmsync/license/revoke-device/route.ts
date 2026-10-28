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
    const unlinkKey = Boolean(body.unlinkKey || body.unlinkAll || !deviceId);
    let email = (body.email || body.userEmail || "").trim().toLowerCase();
    const licenseKey = (body.licenseKey || request.headers.get("x-license-key") || "").trim();

    // Authenticate user via cookie, Bearer header, or safe session helper
    let user: any = null;
    const cookieToken = request.cookies.get("token")?.value;
    if (cookieToken) {
      try {
        const secret = process.env.JWT_SECRET || "MabsolCRM@2026SecretKey";
        let payload: any = null;
        try { payload = jwt.verify(cookieToken, secret); } catch { payload = jwt.verify(cookieToken, "mabsol_super_secret_jwt_key_2026"); }
        if (payload?.email) email = email || payload.email.toLowerCase().trim();
      } catch {}
    }

    if (!email) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7).trim();
          const secret = process.env.JWT_SECRET || "MabsolCRM@2026SecretKey";
          let payload: any = null;
          try { payload = jwt.verify(token, secret); } catch { payload = jwt.verify(token, "mabsol_super_secret_jwt_key_2026"); }
          if (payload?.email) {
            email = email || payload.email.toLowerCase().trim();
          }
        } catch {}
      }
    }

    if (!email) {
      try {
        user = await getCurrentUser();
        if (user?.email) {
          email = email || user.email.toLowerCase().trim();
        }
      } catch {}
    }

    const cleanDevId = deviceId ? deviceId.toLowerCase() : "";
    const queryConditions: any[] = [];
    if (licenseKey) queryConditions.push({ license: licenseKey });
    if (email) {
      queryConditions.push({ email });
      queryConditions.push({ key: "vfp_sync_config_" + email });
    }
    queryConditions.push({ key: "vfp_sync_config" });

    if (unlinkKey) {
      // Unlink entire active key and all attached devices
      await VfpConfig.updateMany(
        { $or: queryConditions },
        {
          $set: {
            license: "",
            licenseExpiresAt: null,
            licenseStatus: "unlinked",
            boundDeviceId: "",
            boundDeviceName: "",
            boundAt: null,
            authorizedDevices: [],
          },
        }
      );

      // Expire all pending/activated AgentPins for this user
      const AgentPin = (await import("@/models/AgentPin")).default;
      await AgentPin.updateMany(
        {
          $or: [
            ...(licenseKey ? [{ licenseKey }] : []),
            ...(email ? [{ activatedByEmail: email }] : []),
          ],
        },
        { $set: { status: "expired" } }
      );
    } else {
      // Pull specific device from authorizedDevices across all related configs
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

      // Expire matching AgentPin
      const AgentPin = (await import("@/models/AgentPin")).default;
      await AgentPin.updateMany(
        { deviceId: { $regex: new RegExp(`^${cleanDevId}$`, "i") } },
        { $set: { status: "expired" } }
      );
    }

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
