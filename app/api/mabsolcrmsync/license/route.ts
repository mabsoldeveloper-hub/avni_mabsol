import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

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

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    
    let userEmail = user?.email || "";
    if (!userEmail) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7).trim();
          const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
          if (payload?.email) {
            userEmail = payload.email;
          }
        } catch {
          // invalid or expired token
        }
      }
    }

    const licenseHeader = request.headers.get("x-license-key") || request.nextUrl.searchParams.get("licenseKey") || "";

    let config: any = null;
    if (userEmail) {
      config =
        (await VfpConfig.findOne({ email: userEmail })) ||
        (await VfpConfig.findOne({ key: "vfp_sync_config_" + userEmail }));
    }

    const now = new Date();
    const userDoc: any = userEmail ? await User.findOne({ email: userEmail }).lean() : null;

    // If new user logged in, or user config has no active license,
    // inherit the company/organization's active license with the EXACT same day, time and expiration
    const isUserConfigActive = Boolean(
      config?.license && config?.licenseExpiresAt && now <= new Date(config.licenseExpiresAt)
    );

    if (!isUserConfigActive) {
      let companyConfig: any = null;
      if (userDoc?.tenantId || userDoc?.companyId) {
        const siblings = await User.find({
          $or: [
            ...(userDoc.tenantId ? [{ tenantId: userDoc.tenantId }] : []),
            ...(userDoc.companyId ? [{ companyId: userDoc.companyId }] : []),
          ],
        }).select("email").lean();
        const siblingEmails = siblings.map((s: any) => s.email?.toLowerCase()).filter(Boolean);

        if (siblingEmails.length > 0) {
          companyConfig = await VfpConfig.findOne({
            email: { $in: siblingEmails },
            license: { $exists: true, $ne: "" },
            licenseExpiresAt: { $gt: now },
          }).sort({ licenseExpiresAt: -1 }).lean();
        }
      }

      if (!companyConfig) {
        companyConfig = await VfpConfig.findOne({
          key: "vfp_sync_config",
          license: { $exists: true, $ne: "" },
        }).lean();
      }

      if (companyConfig?.license) {
        config = {
          ...(config || {}),
          ...companyConfig,
          email: userEmail || config?.email,
          key: userEmail ? "vfp_sync_config_" + userEmail : (config?.key || "vfp_sync_config"),
        };

        // Persist to this new user's VfpConfig so they have the exact same license, day, time and expiration
        if (userEmail) {
          await VfpConfig.updateOne(
            { email: userEmail },
            {
              $set: {
                license: companyConfig.license,
                licenseIssuedAt: companyConfig.licenseIssuedAt,
                licenseExpiresAt: companyConfig.licenseExpiresAt,
                licenseStatus: companyConfig.licenseStatus || "active",
                companyName: companyConfig.companyName || userDoc?.companyName || "",
                companyCode: companyConfig.companyCode || userDoc?.companyCode || "",
              },
            },
            { upsert: true }
          );
        }
      }
    }

    if (!config && licenseHeader) {
      config = await VfpConfig.findOne({ license: licenseHeader.trim() });
    }
    if (!config) {
      config = await VfpConfig.findOne({ key: "vfp_sync_config" });
    }

    if (!user && !userEmail && !licenseHeader && !config) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const license = config?.license || "";
    const licenseExpiresAt = config?.licenseExpiresAt ? new Date(config.licenseExpiresAt) : null;
    const licenseIssuedAt = config?.licenseIssuedAt ? new Date(config.licenseIssuedAt) : null;
    const boundDeviceId = config?.boundDeviceId || "";
    const boundDeviceName = config?.boundDeviceName || "";
    const isExpired = licenseExpiresAt ? now > licenseExpiresAt : false;
    let daysRemaining = 0;
    if (licenseExpiresAt && !isExpired) {
      const diffMs = licenseExpiresAt.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const authorizedDevices = Array.isArray(config?.authorizedDevices)
      ? config.authorizedDevices.map((d: any) => ({
          deviceId: d.deviceId ? `${d.deviceId.substring(0, 8)}...` : "",
          fullDeviceId: d.deviceId || "",
          deviceName: d.deviceName || "Desktop Agent",
          licenseKey: d.licenseKey || config.license || "",
          activationEmail: d.activationEmail || config?.email || userEmail || "Account Email",
          activatedAt: d.activatedAt,
          expiresAt: d.expiresAt,
          lastSeenAt: d.lastSeenAt,
          status: d.status || "active",
          isExpired: d.expiresAt ? now > new Date(d.expiresAt) : false,
          daysRemaining: d.expiresAt && now < new Date(d.expiresAt)
            ? Math.max(0, Math.ceil((new Date(d.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 0,
        }))
      : [];

    if (authorizedDevices.length === 0 && boundDeviceId) {
      authorizedDevices.push({
        deviceId: `${boundDeviceId.substring(0, 8)}...`,
        fullDeviceId: boundDeviceId,
        deviceName: boundDeviceName || "Primary Machine",
        licenseKey: license || "",
        activationEmail: config?.email || userEmail || "Account Email",
        activatedAt: config?.boundAt || licenseIssuedAt,
        expiresAt: licenseExpiresAt,
        lastSeenAt: config?.boundAt || now,
        status: "active",
        isExpired,
        daysRemaining,
      });
    }

    let resolvedCompName = config?.companyName || (user as any)?.companyName || userDoc?.companyName || "";
    let resolvedCompCode = config?.companyCode || (user as any)?.companyCode || userDoc?.companyCode || "";

    const isPlaceholderComp = (val: string) => {
      if (!val) return true;
      const lower = val.trim().toLowerCase();
      return lower === "organization" || lower === "your organization" || lower === "default" || lower === "test";
    };

    if (isPlaceholderComp(resolvedCompName)) {
      resolvedCompName = "";
    }
    if (isPlaceholderComp(resolvedCompCode)) {
      resolvedCompCode = "";
    }

    if ((!resolvedCompName || !resolvedCompCode) && userDoc?.companyId) {
      try {
        const CompanyModel = mongoose.models.Company || mongoose.model("Company");
        const compDoc: any = await CompanyModel.findById(userDoc.companyId).lean();
        if (compDoc) {
          if (!resolvedCompName && !isPlaceholderComp(compDoc.companyName || compDoc.name)) {
            resolvedCompName = compDoc.companyName || compDoc.name || "";
          }
          if (!resolvedCompCode && !isPlaceholderComp(compDoc.companyCode || compDoc.code)) {
            resolvedCompCode = compDoc.companyCode || compDoc.code || "";
          }
        }
      } catch {}
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
      authorizedDevices,
      totalDevicesCount: authorizedDevices.length,
      companyName: resolvedCompName,
      companyCode: resolvedCompCode,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    let userEmail = user?.email ? user.email.toLowerCase() : "";

    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    if (!userEmail) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7).trim();
          const payload = jwt.verify(token, process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026") as any;
          if (payload?.email) {
            userEmail = payload.email.toLowerCase();
          }
        } catch {
          // invalid or expired token
        }
      }
    }

    if (!userEmail && body?.email) {
      userEmail = String(body.email).toLowerCase().trim();
    }

    if (!userEmail) {
      return NextResponse.json({ success: false, error: "Unauthorized: Account email or session required" }, { status: 401 });
    }

    const userDoc: any = await User.findOne({ email: userEmail }).lean();
    let siblingEmails: string[] = [];
    if (userDoc?.tenantId || userDoc?.companyId) {
      const siblings = await User.find({
        $or: [
          ...(userDoc.tenantId ? [{ tenantId: userDoc.tenantId }] : []),
          ...(userDoc.companyId ? [{ companyId: userDoc.companyId }] : []),
        ],
      }).select("email").lean();
      siblingEmails = siblings
        .map((s: any) => s.email?.toLowerCase())
        .filter(Boolean);
    }

    let existingConfig: any =
      (await VfpConfig.findOne({ email: userEmail }).lean()) ||
      (await VfpConfig.findOne({ key: "vfp_sync_config_" + userEmail }).lean());

    if (!existingConfig?.license && siblingEmails.length > 0) {
      existingConfig = await VfpConfig.findOne({
        email: { $in: siblingEmails },
        license: { $exists: true, $ne: "" },
      }).sort({ licenseExpiresAt: -1 }).lean();
    }

    if (!existingConfig) {
      existingConfig = await VfpConfig.findOne({ key: "vfp_sync_config" }).lean();
    }

    const now = new Date();
    const existingExpiresAt = existingConfig?.licenseExpiresAt
      ? new Date(existingConfig.licenseExpiresAt)
      : null;
    const isCurrentExpired = existingExpiresAt ? now > existingExpiresAt : true;

    const allowRegenerate = Boolean(
      body?.regenerate ||
      body?.force ||
      body?.newKeyGen ||
      body?.isDesktopAgent ||
      isCurrentExpired ||
      !existingConfig?.license
    );

    // If key regeneration is not explicitly requested and key is still active
    if (existingConfig?.license && !isCurrentExpired && !allowRegenerate) {
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

    // Keep the exact same day, time and expiration date of the active period
    const hasActivePeriod = Boolean(existingExpiresAt && !isCurrentExpired);
    const expiresAt = hasActivePeriod
      ? existingExpiresAt!
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const issuedAt = hasActivePeriod && existingConfig?.licenseIssuedAt
      ? new Date(existingConfig.licenseIssuedAt)
      : now;

    const diffMs = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const newKey = generateFormattedKey();

    const usedLicenses: any[] = Array.isArray(existingConfig?.usedLicenses)
      ? [...existingConfig.usedLicenses]
      : [];

    // If an old license exists, retire it so history is cleanly maintained
    if (existingConfig?.license && existingConfig.license !== newKey) {
      usedLicenses.push({
        key: existingConfig.license,
        issuedAt: existingConfig.licenseIssuedAt || new Date(now.getTime() - 86400000),
        expiredAt: now,
        boundDeviceId: existingConfig.boundDeviceId || "",
        status: "retired",
        reason: "Rotated / New Key Generated",
      });
    }

    const deviceId = (body?.deviceId || request.headers.get("x-device-id") || "").trim();
    const deviceName = (body?.deviceName || request.headers.get("x-device-name") || "Operator Workstation").trim();

    const updateData: any = {
      license: newKey,
      licenseIssuedAt: issuedAt,
      licenseExpiresAt: expiresAt,
      licenseStatus: "active",
      usedLicenses,
    };

    if (deviceId) {
      updateData.boundDeviceId = deviceId;
      updateData.boundDeviceName = deviceName;
      updateData.boundAt = now;
      updateData.isLicenseVerified = true;
      updateData.lastVerifiedLicense = newKey;

      const existingDevices = Array.isArray(existingConfig?.authorizedDevices)
        ? [...existingConfig.authorizedDevices]
        : [];
      const cleanDevId = deviceId.toLowerCase();
      const devIdx = existingDevices.findIndex((d: any) => d.deviceId?.toLowerCase() === cleanDevId);
      const devObj = {
        deviceId,
        deviceName,
        licenseKey: newKey,
        activationEmail: userEmail,
        activatedAt: now,
        expiresAt,
        lastSeenAt: now,
        status: "active",
      };
      if (devIdx >= 0) {
        existingDevices[devIdx] = devObj;
      } else {
        existingDevices.push(devObj);
      }
      updateData.authorizedDevices = existingDevices;
    } else {
      updateData.boundDeviceId = "";
      updateData.boundDeviceName = "";
      updateData.boundAt = null;
    }

    await VfpConfig.updateOne(
      { key: "vfp_sync_config_" + userEmail },
      { $set: { ...updateData, email: userEmail } },
      { upsert: true }
    );

    await VfpConfig.updateOne(
      { email: userEmail },
      { $set: updateData },
      { upsert: true }
    );

    // Sync new key with same day, time and expiration across all sibling users in the company
    if (siblingEmails.length > 0) {
      await VfpConfig.updateMany(
        { email: { $in: siblingEmails } },
        {
          $set: {
            license: newKey,
            licenseIssuedAt: issuedAt,
            licenseExpiresAt: expiresAt,
            licenseStatus: "active",
          },
        }
      );
      for (const sibEmail of siblingEmails) {
        await VfpConfig.updateOne(
          { key: "vfp_sync_config_" + sibEmail },
          {
            $set: {
              license: newKey,
              licenseIssuedAt: issuedAt,
              licenseExpiresAt: expiresAt,
              licenseStatus: "active",
            },
          }
        );
      }
    }

    await VfpConfig.updateOne(
      { key: "vfp_sync_config" },
      { $set: updateData },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      license: newKey,
      licenseIssuedAt: issuedAt,
      licenseExpiresAt: expiresAt,
      daysRemaining,
      boundDeviceId: deviceId ? `${deviceId.substring(0, 8)}...` : "",
      boundDeviceName: deviceName,
      message: `New license key generated! Valid until ${expiresAt.toLocaleDateString()} (${daysRemaining} days remaining). Same day & time preserved.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
