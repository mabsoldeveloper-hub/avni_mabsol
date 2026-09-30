import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import User from "@/models/User";
import Otp from "@/models/Otp";

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

    const email = (body.email || body.userEmail || "").trim().toLowerCase();
    const deviceId = (body.deviceId || "").trim();
    const deviceName = (body.deviceName || "Desktop Agent").trim();
    const otp = (body.otp || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Account email is required." }, { status: 400 });
    }

    if (!deviceId) {
      return NextResponse.json({ success: false, error: "Device identifier is required." }, { status: 400 });
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ success: false, error: "A valid 6-digit OTP code is required." }, { status: 400 });
    }

    // 1. Verify OTP record
    const otpRecord = await Otp.findOne({ email, type: "email" });
    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: "No verification code requested for this email. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    const MAX_ATTEMPTS = 5;
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { success: false, error: "Too many failed attempts. Please request a new verification code." },
        { status: 400 }
      );
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      await otpRecord.save();
      const remaining = MAX_ATTEMPTS - otpRecord.attempts;
      return NextResponse.json(
        { success: false, error: `Invalid verification code. ${remaining} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    // Mark OTP verified and clean up
    otpRecord.verified = true;
    await otpRecord.save();

    // 2. Fetch User and Company info
    const user = await User.findOne({ email });

    // 3. Generate 30-Day Device License Key
    const now = new Date();
    const validityDays = 30;
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
    const newLicenseKey = generateFormattedKey();

    // 4. Find or Create VfpConfig
    let config: any =
      (await VfpConfig.findOne({ email })) ||
      (await VfpConfig.findOne({ key: "vfp_sync_config_" + email })) ||
      (await VfpConfig.findOne({ key: "vfp_sync_config" }));

    const deviceEntry = {
      deviceId,
      deviceName,
      licenseKey: newLicenseKey,
      activatedAt: now,
      expiresAt,
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
        license: newLicenseKey,
        licenseIssuedAt: now,
        licenseExpiresAt: expiresAt,
        licenseStatus: "active",
        boundDeviceId: deviceId,
        boundDeviceName: deviceName,
        boundAt: now,
        authorizedDevices: [deviceEntry],
      });
    } else {
      let authorizedDevices: any[] = Array.isArray(config.authorizedDevices) ? config.authorizedDevices : [];
      const existingIdx = authorizedDevices.findIndex((d: any) => d.deviceId === deviceId);

      if (existingIdx >= 0) {
        authorizedDevices[existingIdx] = {
          ...authorizedDevices[existingIdx],
          licenseKey: newLicenseKey,
          deviceName,
          activatedAt: now,
          expiresAt,
          lastSeenAt: now,
          status: "active",
          activationEmail: email,
        };
      } else {
        authorizedDevices.push(deviceEntry);
      }

      config.authorizedDevices = authorizedDevices;
      config.email = config.email || email;
      // Update primary license pointer if unset or expired
      if (!config.license || (config.licenseExpiresAt && now > new Date(config.licenseExpiresAt))) {
        config.license = newLicenseKey;
        config.licenseIssuedAt = now;
        config.licenseExpiresAt = expiresAt;
        config.licenseStatus = "active";
        config.boundDeviceId = deviceId;
        config.boundDeviceName = deviceName;
        config.boundAt = now;
      }
      await config.save();
    }

    return NextResponse.json({
      success: true,
      licenseKey: newLicenseKey,
      expiresAt,
      daysRemaining: validityDays,
      deviceId,
      deviceName,
      companyName: config.companyName || user?.companyName || "",
      companyCode: config.companyCode || "DEFAULT",
      message: `Machine "${deviceName}" activated successfully with a 30-day sync license!`,
    });
  } catch (err: any) {
    console.error("[License Activate Device Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to activate device license." },
      { status: 500 }
    );
  }
}
