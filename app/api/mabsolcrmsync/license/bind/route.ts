import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
    }

    const licenseKey = (body.licenseKey || request.headers.get("x-license-key") || "").trim();
    const deviceId = (body.deviceId || request.headers.get("x-device-id") || "").trim();
    const deviceName = (body.deviceName || request.headers.get("x-device-name") || "Operator Machine").trim();
    const userEmail = (body.userEmail || body.email || "").trim().toLowerCase();

    if (!licenseKey) {
      return NextResponse.json(
        { success: false, error: "License key is required." },
        { status: 400 }
      );
    }

    // Try finding by exact license first, then by company sync config, then by user email
    let config: any = await VfpConfig.findOne({ license: licenseKey }).lean();
    if (!config) {
      config = await VfpConfig.findOne({ key: "vfp_sync_config" }).lean();
    }
    if (!config && userEmail) {
      config = await VfpConfig.findOne({ email: userEmail }).lean();
    }

    if (!config || !config.license) {
      return NextResponse.json(
        { success: false, error: "Invalid license key. No matching active license was found on the server." },
        { status: 404 }
      );
    }

    // Check if key was retired or belongs to usedLicenses
    const usedLicenses: any[] = Array.isArray(config.usedLicenses) ? config.usedLicenses : [];
    const isRetired = usedLicenses.some((u: any) => u.key === licenseKey);
    if (isRetired) {
      return NextResponse.json(
        {
          success: false,
          licenseExpired: true,
          error: "This license key has expired or was replaced by a newer key. It cannot be reused.",
        },
        { status: 403 }
      );
    }

    // Check 30-day validity expiration
    const now = new Date();
    if (config.licenseExpiresAt && now > new Date(config.licenseExpiresAt)) {
      return NextResponse.json(
        {
          success: false,
          licenseExpired: true,
          error: `License key expired on ${new Date(config.licenseExpiresAt).toLocaleDateString()}. Please generate a new key.`,
        },
        { status: 403 }
      );
    }

    // Single-device binding lock check
    if (deviceId) {
      if (config.boundDeviceId && config.boundDeviceId !== deviceId) {
        return NextResponse.json(
          {
            success: false,
            deviceMismatch: true,
            error: `License key is already locked to machine: "${config.boundDeviceName || "Another Device"}". It cannot be used on this machine.`,
          },
          { status: 403 }
        );
      }

      // Bind machine immediately across all config representations
      const updatePayload = {
        boundDeviceId: deviceId,
        boundDeviceName: deviceName || "Operator Machine",
        boundAt: now,
        licenseStatus: "active",
      };

      await VfpConfig.updateMany(
        { license: licenseKey },
        { $set: updatePayload }
      );

      await VfpConfig.updateMany(
        { key: { $in: ["vfp_sync_config", "vfp_sync_config_" + userEmail] } },
        { $set: updatePayload }
      );

      if (userEmail) {
        await VfpConfig.updateMany(
          { email: userEmail },
          { $set: updatePayload }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `License key verified and locked to machine: ${deviceName}`,
      boundDeviceId: deviceId,
      boundDeviceName: deviceName,
      licenseExpiresAt: config.licenseExpiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to bind license key." },
      { status: 500 }
    );
  }
}
