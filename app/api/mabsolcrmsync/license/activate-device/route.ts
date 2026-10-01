import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import User from "@/models/User";
import Otp from "@/models/Otp";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateFormattedKey(): string {
  const segment1 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const segment2 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const segment3 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const segment4 = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `MAB-${segment1}-${segment2}-${segment3}-${segment4}`;
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    let email = (body.email || body.userEmail || "").trim().toLowerCase();
    const deviceId = (body.deviceId || request.headers.get("x-device-id") || "").trim();
    const deviceName = (body.deviceName || request.headers.get("x-device-name") || "Desktop Agent").trim();
    const otp = String(body.otp || "").trim();
    const licenseKey = (body.licenseKey || request.headers.get("x-license-key") || "").trim();

    // Fallback: extract email from Bearer token
    if (!email) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7).trim();
          const payload = jwt.verify(token, process.env.JWT_SECRET || "MabsolCRM@2026SecretKey") as any;
          if (payload?.email) {
            email = payload.email.toLowerCase().trim();
          }
        } catch {}
      }
    }

    // Fallback: find email from licenseKey in VfpConfig
    if (!email && licenseKey) {
      const cfg: any = await VfpConfig.findOne({ license: licenseKey }).lean();
      if (cfg?.email) {
        email = cfg.email.toLowerCase().trim();
      }
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Account email is required." }, { status: 400 });
    }

    if (!deviceId) {
      return NextResponse.json({ success: false, error: "Device identifier is required." }, { status: 400 });
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ success: false, error: "A valid 6-digit OTP code is required." }, { status: 400 });
    }

    // 1. Verify OTP record (get freshest OTP for this email)
    const otpRecord = await Otp.findOne({ email }).sort({ updatedAt: -1, createdAt: -1 });
    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: "No verification code found for this email. Please click 'Send Verification Code' first." },
        { status: 400 }
      );
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await Otp.deleteMany({ email });
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    const MAX_ATTEMPTS = 5;
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await Otp.deleteMany({ email });
      return NextResponse.json(
        { success: false, error: "Too many failed attempts. Please request a new verification code." },
        { status: 400 }
      );
    }

    if (String(otpRecord.otp).trim() !== otp) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      await otpRecord.save();
      const remaining = MAX_ATTEMPTS - otpRecord.attempts;
      return NextResponse.json(
        { success: false, error: `Invalid verification code. ${remaining} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    // Mark OTP verified and clean up all OTP records for this email
    await Otp.deleteMany({ email });

    // 2. Fetch User and Company info
    const user = await User.findOne({ email });

    // 3. Find existing VfpConfig
    let config: any = null;
    if (licenseKey) {
      config = await VfpConfig.findOne({ license: licenseKey });
    }
    if (!config && email) {
      config =
        (await VfpConfig.findOne({ email })) ||
        (await VfpConfig.findOne({ key: "vfp_sync_config_" + email })) ||
        (await VfpConfig.findOne({ key: "vfp_sync_config" }));
    } else if (!config) {
      config = await VfpConfig.findOne({ key: "vfp_sync_config" });
    }

    // 4. Determine License Key to authorize:
    // Reuse existing account/server license key so the same key works across verified devices!
    const now = new Date();
    let targetLicenseKey = (config?.license && config.license.trim()) || (licenseKey && licenseKey.trim()) || "";
    let targetExpiresAt = config?.licenseExpiresAt ? new Date(config.licenseExpiresAt) : null;

    if (!targetLicenseKey) {
      targetLicenseKey = generateFormattedKey();
    }
    if (!targetExpiresAt || now > targetExpiresAt) {
      targetExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const validityDays = Math.max(1, Math.ceil((targetExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const deviceEntry = {
      deviceId,
      deviceName,
      licenseKey: targetLicenseKey,
      activatedAt: now,
      expiresAt: targetExpiresAt,
      lastSeenAt: now,
      status: "active",
      activationEmail: email,
    };

    if (!config) {
      config = await VfpConfig.create({
        key: "vfp_sync_config_" + email,
        email,
        companyName: user?.companyName || "Organization",
        companyCode: user?.companyCode || "DEFAULT",
        license: targetLicenseKey,
        licenseIssuedAt: now,
        licenseExpiresAt: targetExpiresAt,
        licenseStatus: "active",
        boundDeviceId: deviceId,
        boundDeviceName: deviceName,
        boundAt: now,
        authorizedDevices: [deviceEntry],
      });
    } else {
      const cleanDevId = deviceId.trim().toLowerCase();
      let authorizedDevices: any[] = Array.isArray(config.authorizedDevices) ? config.authorizedDevices : [];
      const existingIdx = authorizedDevices.findIndex(
        (d: any) => (d.deviceId || "").trim().toLowerCase() === cleanDevId
      );

      if (existingIdx >= 0) {
        authorizedDevices[existingIdx] = {
          ...authorizedDevices[existingIdx],
          licenseKey: targetLicenseKey,
          deviceName,
          activatedAt: now,
          expiresAt: targetExpiresAt,
          lastSeenAt: now,
          status: "active",
          activationEmail: email,
        };
      } else {
        authorizedDevices.push(deviceEntry);
      }

      config.authorizedDevices = authorizedDevices;
      config.email = config.email || email;
      config.license = targetLicenseKey;
      config.licenseExpiresAt = targetExpiresAt;
      config.licenseStatus = "active";
      config.boundDeviceId = deviceId;
      config.boundDeviceName = deviceName;
      config.boundAt = now;
      await config.save();
    }

    // Propagate authorizedDevices and primary binding to all related VfpConfig representations
    const syncData = {
      authorizedDevices: config.authorizedDevices,
      license: targetLicenseKey,
      licenseExpiresAt: targetExpiresAt,
      licenseStatus: "active",
      boundDeviceId: deviceId,
      boundDeviceName: deviceName,
      boundAt: now,
    };

    const queryConditions: any[] = [];
    if (targetLicenseKey) queryConditions.push({ license: targetLicenseKey });
    if (licenseKey && licenseKey !== targetLicenseKey) queryConditions.push({ license: licenseKey });
    if (email) {
      queryConditions.push({ email });
      queryConditions.push({ key: "vfp_sync_config_" + email });
    }
    queryConditions.push({ key: "vfp_sync_config" });

    await VfpConfig.updateMany(
      { $or: queryConditions },
      { $set: syncData }
    );

    return NextResponse.json({
      success: true,
      authorized: true,
      licenseKey: targetLicenseKey,
      expiresAt: targetExpiresAt,
      daysRemaining: validityDays,
      deviceId,
      deviceName,
      companyName: config.companyName || user?.companyName || "",
      companyCode: config.companyCode || "DEFAULT",
      message: `Machine "${deviceName}" verified and authorized successfully! You can now sync and convert files with this license key.`,
    });
  } catch (err: any) {
    console.error("[License Activate Device Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to activate device license." },
      { status: 500 }
    );
  }
}
