import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import User from "@/models/User";
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

    const deviceId = (body.deviceId || request.headers.get("x-device-id") || "").trim();
    const deviceName = (body.deviceName || request.headers.get("x-device-name") || "Operator Machine").trim();
    let email = (body.email || body.userEmail || "").trim().toLowerCase();

    // Check JWT Bearer token if available
    let tokenUser: any = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7).trim();
        const payload = jwt.verify(token, process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026") as any;
        if (payload?.email) {
          email = email || payload.email.toLowerCase();
          tokenUser = payload;
        }
      } catch {}
    }

    if (!email) {
      const user = await getCurrentUser();
      if (user?.email) email = user.email.toLowerCase();
    }

    if (!deviceId) {
      return NextResponse.json({ success: false, error: "Device identifier is required." }, { status: 400 });
    }

    // Locate company sync config
    let config: any = null;
    if (email) {
      config =
        (await VfpConfig.findOne({ email })) ||
        (await VfpConfig.findOne({ key: "vfp_sync_config_" + email })) ||
        (await VfpConfig.findOne({ key: "vfp_sync_config" }));
    } else {
      config = await VfpConfig.findOne({ key: "vfp_sync_config" });
    }

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          isNewDevice: true,
          authorized: false,
          message: "No sync configuration found for this account. Email OTP verification required to activate device.",
        },
        { status: 200 }
      );
    }

    const now = new Date();

    // 1. Check if device is in authorizedDevices list
    const authorizedDevices: any[] = Array.isArray(config.authorizedDevices) ? config.authorizedDevices : [];
    const matchedDevice = authorizedDevices.find((d: any) => d.deviceId === deviceId && d.status === "active");

    if (matchedDevice) {
      const isExpired = matchedDevice.expiresAt ? now > new Date(matchedDevice.expiresAt) : false;
      let daysRemaining = 0;
      if (matchedDevice.expiresAt && !isExpired) {
        const diffMs = new Date(matchedDevice.expiresAt).getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Update last seen timestamp
      await VfpConfig.updateOne(
        { _id: config._id, "authorizedDevices.deviceId": deviceId },
        {
          $set: {
            "authorizedDevices.$.lastSeenAt": now,
            "authorizedDevices.$.deviceName": deviceName,
          },
        }
      );

      return NextResponse.json({
        success: true,
        authorized: !isExpired,
        isNewDevice: false,
        isExpired,
        licenseKey: matchedDevice.licenseKey,
        expiresAt: matchedDevice.expiresAt,
        daysRemaining,
        deviceName: matchedDevice.deviceName,
        companyName: config.companyName || "",
        companyCode: config.companyCode || "DEFAULT",
        message: isExpired ? "License expired for this machine." : "Machine is authorized and active.",
      });
    }

    // 2. Legacy fallback: Check single boundDeviceId if authorizedDevices is empty
    if (config.boundDeviceId === deviceId) {
      const isExpired = config.licenseExpiresAt ? now > new Date(config.licenseExpiresAt) : false;
      let daysRemaining = 0;
      if (config.licenseExpiresAt && !isExpired) {
        const diffMs = new Date(config.licenseExpiresAt).getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Migrate to authorizedDevices
      await VfpConfig.updateOne(
        { _id: config._id },
        {
          $addToSet: {
            authorizedDevices: {
              deviceId,
              deviceName: deviceName || config.boundDeviceName || "Primary PC",
              licenseKey: config.license,
              activatedAt: config.boundAt || now,
              expiresAt: config.licenseExpiresAt,
              lastSeenAt: now,
              status: "active",
              activationEmail: config.email || email,
            },
          },
        }
      );

      return NextResponse.json({
        success: true,
        authorized: !isExpired,
        isNewDevice: false,
        isExpired,
        licenseKey: config.license,
        expiresAt: config.licenseExpiresAt,
        daysRemaining,
        deviceName: config.boundDeviceName || deviceName,
        companyName: config.companyName || "",
        companyCode: config.companyCode || "DEFAULT",
        message: "Machine authorized via primary license.",
      });
    }

    // 3. New Machine Detected!
    return NextResponse.json({
      success: true,
      authorized: false,
      isNewDevice: true,
      deviceId,
      deviceName,
      email: config.email || email,
      companyName: config.companyName || "",
      message: `New machine detected: "${deviceName}". Please verify your email with an OTP to activate syncing on this computer.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Device check failed" }, { status: 500 });
  }
}
