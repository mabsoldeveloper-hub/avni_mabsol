import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateFormattedKey(): string {
  const segment1 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const segment2 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const segment3 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const segment4 = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `MAB-${segment1}-${segment2}-${segment3}-${segment4}`;
}

export async function GET(_request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const config = (await VfpConfig.findOne({ email: user.email })) ||
      (await VfpConfig.findOne({ key: "vfp_sync_config" }));

    const license = config?.license || "";
    const licenseExpiresAt = config?.licenseExpiresAt ? new Date(config.licenseExpiresAt) : null;
    const licenseIssuedAt = config?.licenseIssuedAt ? new Date(config.licenseIssuedAt) : null;
    const boundDeviceId = config?.boundDeviceId || "";
    const boundDeviceName = config?.boundDeviceName || "";

    const now = new Date();
    const isExpired = licenseExpiresAt ? now > licenseExpiresAt : false;
    let daysRemaining = 0;
    if (licenseExpiresAt && !isExpired) {
      const diffMs = licenseExpiresAt.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      success: true,
      license,
      licenseExpiresAt,
      licenseIssuedAt,
      isExpired,
      daysRemaining,
      boundDeviceId: boundDeviceId ? `${boundDeviceId.substring(0, 8)}...` : "",
      boundDeviceName: boundDeviceName || (boundDeviceId ? "Activated Machine" : "Not yet activated"),
      isBound: Boolean(boundDeviceId),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(_request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const existingConfig: any =
      (await VfpConfig.findOne({ email: user.email }).lean()) ||
      (await VfpConfig.findOne({ key: "vfp_sync_config" }).lean());

    const now = new Date();
    const existingExpiresAt = existingConfig?.licenseExpiresAt
      ? new Date(existingConfig.licenseExpiresAt)
      : null;
    const isCurrentExpired = existingExpiresAt ? now > existingExpiresAt : true;

    // Strict Rule: Once a key is generated, it cannot be regenerated until the 30-day term expires
    if (existingConfig?.license && !isCurrentExpired) {
      const diffMs = existingExpiresAt!.getTime() - now.getTime();
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return NextResponse.json(
        {
          success: false,
          error: `Current license key is still active with ${diffDays} day(s) remaining. A new key cannot be generated until the active 30-day license expires on ${existingExpiresAt!.toLocaleDateString()}.`,
        },
        { status: 400 }
      );
    }

    const validityDays = 30; // Default 30 days validity
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
    const newKey = generateFormattedKey();

    const usedLicenses: any[] = Array.isArray(existingConfig?.usedLicenses)
      ? [...existingConfig.usedLicenses]
      : [];

    // If an old expired license exists, retire it so it can never be reused
    if (existingConfig?.license && existingConfig.license !== newKey) {
      usedLicenses.push({
        key: existingConfig.license,
        issuedAt: existingConfig.licenseIssuedAt || new Date(now.getTime() - 86400000),
        expiredAt: now,
        boundDeviceId: existingConfig.boundDeviceId || "",
        status: "expired",
      });
    }

    const updateData = {
      license: newKey,
      licenseIssuedAt: now,
      licenseExpiresAt: expiresAt,
      licenseStatus: "active",
      boundDeviceId: "",     // Reset device binding for fresh key
      boundDeviceName: "",
      boundAt: null,
      usedLicenses,
    };

    await VfpConfig.updateOne(
      { key: "vfp_sync_config_" + user.email },
      { $set: { ...updateData, email: user.email } },
      { upsert: true }
    );

    await VfpConfig.updateOne(
      { email: user.email },
      { $set: updateData },
      { upsert: true }
    );

    await VfpConfig.updateOne(
      { key: "vfp_sync_config" },
      { $set: updateData },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      license: newKey,
      licenseIssuedAt: now,
      licenseExpiresAt: expiresAt,
      daysRemaining: validityDays,
      message: `New license key generated! Valid for ${validityDays} days. Each key can be activated on 1 device.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
