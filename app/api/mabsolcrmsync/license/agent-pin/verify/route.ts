import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import AgentPin from "@/models/AgentPin";
import VfpConfig from "@/models/VfpConfig";
import User from "@/models/User";
import Company from "@/models/Company";
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

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // 1. Authenticate user from request cookies, Bearer token, or session helper
    let currentUser: any = null;
    let userEmail = "";

    // 1a. Try request cookie directly
    try {
      const token = request.cookies.get("token")?.value;
      if (token) {
        const secret = process.env.JWT_SECRET || "MabsolCRM@2026SecretKey";
        let payload: any = null;
        try {
          payload = jwt.verify(token, secret);
        } catch {
          payload = jwt.verify(token, "mabsol_super_secret_jwt_key_2026");
        }
        if (payload?.email || payload?.id) {
          currentUser = payload.id ? await User.findById(payload.id).lean() : await User.findOne({ email: payload.email }).lean();
          userEmail = currentUser?.email || payload.email || "";
        }
      }
    } catch {}

    // 1b. Try Authorization Bearer header
    if (!userEmail) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7).trim();
          const secret = process.env.JWT_SECRET || "MabsolCRM@2026SecretKey";
          let payload: any = null;
          try {
            payload = jwt.verify(token, secret);
          } catch {
            payload = jwt.verify(token, "mabsol_super_secret_jwt_key_2026");
          }
          if (payload?.email || payload?.id) {
            currentUser = payload.id ? await User.findById(payload.id).lean() : await User.findOne({ email: payload.email }).lean();
            userEmail = currentUser?.email || payload.email || "";
          }
        } catch {}
      }
    }

    // 1c. Safe fallback to getCurrentUser()
    if (!userEmail) {
      try {
        currentUser = await getCurrentUser();
        userEmail = currentUser?.email || "";
      } catch {}
    }

    if (!currentUser || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Please log in to your CRM account to verify and link desktop agents." },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const pin = String(body.pin || "").trim().replace(/\s+/g, "");

    if (!pin || pin.length !== 6) {
      return NextResponse.json(
        { success: false, error: "A valid 6-digit Agent PIN is required." },
        { status: 400 }
      );
    }

    // 2. Lookup pending AgentPin record
    const now = new Date();
    const pinRecord = await AgentPin.findOne({
      pin,
      status: "pending",
      expiresAt: { $gt: now },
    });

    if (!pinRecord) {
      // Check if it already expired
      const expiredRecord = await AgentPin.findOne({ pin });
      if (expiredRecord) {
        return NextResponse.json(
          { success: false, error: "This Agent PIN has expired or was already used. Please request a new PIN from the Desktop Agent." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Invalid Agent PIN. Please check the 6-digit number displayed in the Desktop Agent." },
        { status: 400 }
      );
    }

    // 3. Find or initialize VfpConfig for this user / organization
    const userDoc: any = await User.findOne({ email: userEmail });
    let config: any =
      (await VfpConfig.findOne({ email: userEmail })) ||
      (await VfpConfig.findOne({ key: "vfp_sync_config_" + userEmail })) ||
      (await VfpConfig.findOne({ key: "vfp_sync_config" }));

    // If current user has no active license, check company/tenant active license to inherit exact cycle
    const userCompany = userDoc?.companyName || currentUser.companyName;
    const userTenantId = userDoc?.tenantId || currentUser.tenantId;

    if ((!config || !config.license || now > new Date(config.licenseExpiresAt)) && (userCompany || userTenantId)) {
      const tenantUsers: any = await User.find({
        $or: [
          ...(userCompany ? [{ companyName: userCompany }] : []),
          ...(userTenantId ? [{ tenantId: userTenantId }] : []),
        ],
      }).select("email");
      const tenantEmails = tenantUsers.map((u: any) => u.email).filter(Boolean);

      if (tenantEmails.length > 0) {
        const activeTenantConfig: any = await VfpConfig.findOne({
          email: { $in: tenantEmails },
          license: { $exists: true, $ne: "" },
          licenseExpiresAt: { $gt: now },
        }).sort({ licenseExpiresAt: -1 });

        if (activeTenantConfig) {
          config = activeTenantConfig;
        }
      }
    }

    // 4. Generate a NEW key for this user & PIN, synchronized with the account's active remaining cycle
    // (e.g. if the account has 20 days remaining, the new key also has 20 days remaining)
    const targetLicenseKey = generateFormattedKey();
    let targetExpiresAt: Date;
    let targetIssuedAt: Date;
    let validityDays: number;

    const existingExpiry = config?.licenseExpiresAt ? new Date(config.licenseExpiresAt) : null;
    const isExistingActive = Boolean(existingExpiry && existingExpiry.getTime() > now.getTime() && config?.license);

    if (isExistingActive) {
      targetExpiresAt = existingExpiry!;
      targetIssuedAt = config.licenseIssuedAt ? new Date(config.licenseIssuedAt) : now;
      const diffMs = targetExpiresAt.getTime() - now.getTime();
      validityDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } else {
      targetIssuedAt = now;
      targetExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      validityDays = 30;
    }

    // Dynamically retrieve company name and company code from Company Master or User (no static fallback)
    let targetCompName = "";
    let targetCompCode = "";

    if (userDoc?.companyId) {
      try {
        const compDoc: any = await Company.findById(userDoc.companyId).lean();
        if (compDoc) {
          targetCompName = compDoc.companyName || "";
          targetCompCode = compDoc.companyCode || "";
        }
      } catch {}
    }

    if (!targetCompName) {
      targetCompName = userDoc?.companyName || currentUser.companyName || config?.companyName || "";
    }
    if (!targetCompCode) {
      targetCompCode = userDoc?.companyCode || currentUser.companyCode || config?.companyCode || "";
    }

    // 5. Clean POJO mapping to prevent Mongoose subdocument circular reference
    const cleanDevId = pinRecord.deviceId.trim().toLowerCase();
    const existingDevices = Array.isArray(config?.authorizedDevices)
      ? config.authorizedDevices.map((d: any) => ({
          deviceId: String(d.deviceId || ""),
          deviceName: String(d.deviceName || "Desktop Agent"),
          licenseKey: String(d.licenseKey || targetLicenseKey),
          activatedAt: d.activatedAt ? new Date(d.activatedAt) : now,
          expiresAt: d.expiresAt ? new Date(d.expiresAt) : targetExpiresAt,
          lastSeenAt: d.lastSeenAt ? new Date(d.lastSeenAt) : now,
          status: String(d.status || "active"),
          activationEmail: String(d.activationEmail || userEmail),
        }))
      : [];

    const existingIdx = existingDevices.findIndex(
      (d: any) => (d.deviceId || "").trim().toLowerCase() === cleanDevId
    );

    const deviceEntry = {
      deviceId: pinRecord.deviceId,
      deviceName: pinRecord.deviceName || "Desktop Agent",
      licenseKey: targetLicenseKey,
      activatedAt: now,
      expiresAt: targetExpiresAt,
      lastSeenAt: now,
      status: "active",
      activationEmail: userEmail,
    };

    if (existingIdx >= 0) {
      existingDevices[existingIdx] = {
        ...existingDevices[existingIdx],
        ...deviceEntry,
      };
    } else {
      existingDevices.push(deviceEntry);
    }

    const syncData = {
      authorizedDevices: existingDevices,
      email: config?.email || userEmail,
      companyName: targetCompName,
      companyCode: targetCompCode,
      license: targetLicenseKey,
      licenseIssuedAt: targetIssuedAt,
      licenseExpiresAt: targetExpiresAt,
      licenseStatus: "active",
      boundDeviceId: pinRecord.deviceId,
      boundDeviceName: pinRecord.deviceName || "Desktop Agent",
      boundAt: now,
    };

    if (!config) {
      config = await VfpConfig.create({
        key: "vfp_sync_config_" + userEmail,
        ...syncData,
      });
    } else {
      await VfpConfig.updateOne(
        { _id: config._id },
        { $set: syncData }
      );
    }

    // Propagate to tenant configs
    const queryConditions: any[] = [];
    if (targetLicenseKey) queryConditions.push({ license: targetLicenseKey });
    if (userEmail) {
      queryConditions.push({ email: userEmail });
      queryConditions.push({ key: "vfp_sync_config_" + userEmail });
    }
    queryConditions.push({ key: "vfp_sync_config" });

    await VfpConfig.updateMany(
      { $or: queryConditions },
      { $set: syncData }
    );

    // 6. Mark AgentPin as activated
    pinRecord.status = "activated";
    pinRecord.licenseKey = targetLicenseKey;
    pinRecord.licenseExpiresAt = targetExpiresAt;
    pinRecord.expiresAt = targetExpiresAt; // Extend TTL to license expiration
    pinRecord.companyName = targetCompName;
    pinRecord.companyCode = targetCompCode;
    pinRecord.activatedByUserId = String(currentUser._id || userDoc?._id || "");
    pinRecord.activatedByEmail = userEmail;
    pinRecord.activatedAt = now;
    await pinRecord.save();

    return NextResponse.json({
      success: true,
      pin,
      licenseKey: targetLicenseKey,
      expiresAt: targetExpiresAt,
      daysRemaining: validityDays,
      deviceId: pinRecord.deviceId,
      deviceName: pinRecord.deviceName,
      companyName: targetCompName,
      companyCode: targetCompCode,
      message: `Machine "${pinRecord.deviceName}" authorized successfully! License key "${targetLicenseKey}" linked and active.`,
    });
  } catch (err: any) {
    console.error("[Agent Pin Verify Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify Agent PIN." },
      { status: 500 }
    );
  }
}
