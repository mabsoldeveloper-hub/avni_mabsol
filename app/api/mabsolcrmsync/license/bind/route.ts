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

    // Check if device is already authorized
    const authorizedDevices: any[] = Array.isArray(config.authorizedDevices) ? config.authorizedDevices : [];
    const isDeviceAuthorized =
      authorizedDevices.some(
        (d: any) => d.deviceId === deviceId && d.status === "active" && (!d.expiresAt || new Date(d.expiresAt) > now)
      ) || (config.boundDeviceId && config.boundDeviceId === deviceId);

    if (deviceId) {
      if (isDeviceAuthorized) {
        // Machine is already authorized! Update last seen timestamp & device name
        const updatePayload = {
          license: licenseKey,
          licenseExpiresAt: config.licenseExpiresAt,
          licenseIssuedAt: config.licenseIssuedAt,
          licenseStatus: "active",
        };

        await VfpConfig.updateMany(
          { _id: config._id, "authorizedDevices.deviceId": deviceId },
          {
            $set: {
              "authorizedDevices.$.lastSeenAt": now,
              "authorizedDevices.$.deviceName": deviceName || "Operator Machine",
              "authorizedDevices.$.licenseKey": licenseKey,
              ...updatePayload,
            },
          }
        );

        // If not in authorizedDevices but was boundDeviceId, add to authorizedDevices
        const inArray = authorizedDevices.some((d: any) => d.deviceId === deviceId);
        if (!inArray) {
          await VfpConfig.updateOne(
            { _id: config._id },
            {
              $addToSet: {
                authorizedDevices: {
                  deviceId,
                  deviceName: deviceName || config.boundDeviceName || "Operator Machine",
                  licenseKey,
                  activatedAt: config.boundAt || now,
                  expiresAt: config.licenseExpiresAt,
                  lastSeenAt: now,
                  status: "active",
                  activationEmail: config.email || userEmail,
                },
              },
            }
          );
        }

        return NextResponse.json({
          success: true,
          authorized: true,
          message: `License key verified and active on machine: ${deviceName}`,
          boundDeviceId: deviceId,
          boundDeviceName: deviceName,
          licenseExpiresAt: config.licenseExpiresAt,
        });
      }

      // Check if this is the very first machine activating a freshly generated key
      if (!config.boundDeviceId && authorizedDevices.length === 0) {
        const updatePayload = {
          license: licenseKey,
          licenseExpiresAt: config.licenseExpiresAt,
          licenseIssuedAt: config.licenseIssuedAt,
          boundDeviceId: deviceId,
          boundDeviceName: deviceName || "Primary Machine",
          boundAt: now,
          licenseStatus: "active",
        };

        const deviceEntry = {
          deviceId,
          deviceName: deviceName || "Primary Machine",
          licenseKey,
          activatedAt: now,
          expiresAt: config.licenseExpiresAt,
          lastSeenAt: now,
          status: "active",
          activationEmail: config.email || userEmail,
        };

        await VfpConfig.updateMany(
          { license: licenseKey },
          { $set: updatePayload, $addToSet: { authorizedDevices: deviceEntry } }
        );

        await VfpConfig.updateMany(
          { key: { $in: ["vfp_sync_config", "vfp_sync_config_" + userEmail] } },
          { $set: updatePayload, $addToSet: { authorizedDevices: deviceEntry } }
        );

        if (userEmail) {
          await VfpConfig.updateMany(
            { email: userEmail },
            { $set: updatePayload, $addToSet: { authorizedDevices: deviceEntry } }
          );
        }

        return NextResponse.json({
          success: true,
          authorized: true,
          message: `License key activated and authorized for primary machine: ${deviceName}`,
          boundDeviceId: deviceId,
          boundDeviceName: deviceName,
          licenseExpiresAt: config.licenseExpiresAt,
        });
      }

      // If we reach here, this machine is not yet authorized for this license key!
      // DO NOT permanently lock: Prompt for email OTP verification so they can authorize this computer.
      const primaryOwner = config.boundDeviceName || "Another Machine";
      return NextResponse.json(
        {
          success: false,
          authorized: false,
          requiresVerification: true,
          deviceMismatch: true,
          email: config.email || userEmail,
          deviceId,
          deviceName,
          licenseKey,
          boundDeviceName: primaryOwner,
          error: `This computer "${deviceName}" is not yet authorized for this license key (currently registered on ${primaryOwner}). Please verify with the code sent to ${config.email || userEmail || "your email"} to authorize this machine for syncing.`,
        },
        { status: 403 }
      );
    } else if (userEmail) {
      await VfpConfig.updateMany(
        { email: userEmail },
        {
          $set: {
            license: licenseKey,
            licenseExpiresAt: config.licenseExpiresAt,
            licenseIssuedAt: config.licenseIssuedAt,
            licenseStatus: "active",
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: `License key verified: ${licenseKey}`,
      licenseExpiresAt: config.licenseExpiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to bind license key." },
      { status: 500 }
    );
  }
}
