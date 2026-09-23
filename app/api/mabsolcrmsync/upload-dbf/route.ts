import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { performDirectServerSync } from "@/lib/vfp/dbfSync";
import VfpConfig from "@/models/VfpConfig";
import fs from "fs";
import path from "path";

import jwt from "jsonwebtoken";
import User from "@/models/User";
import { validateUserLoginAccess } from "@/lib/services/superAdmin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    let user = await getCurrentUser();

    // Support Desktop Agent authentication via Bearer token or License Key headers
    if (!user) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
          if (payload && payload.id) {
            user = await User.findById(payload.id);
          }
        } catch {}
      }
    }

    if (!user) {
      const licenseKey = request.headers.get("x-license-key");
      const agentEmail = request.headers.get("x-agent-email");
      if (licenseKey && agentEmail) {
        const config = await VfpConfig.findOne({ email: agentEmail, license: licenseKey });
        if (config) {
          user = await User.findOne({ email: agentEmail });
        }
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please login or provide a valid agent token." }, { status: 401 });
    }

    // Verify user account is active, approved, and not suspended or deactivated
    const accessCheck = await validateUserLoginAccess(user);
    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: accessCheck.message || "Account is suspended or deactivated. Access denied.",
          accountSuspended: true,
        },
        { status: 403 }
      );
    }

    // Validate License Key, Expiry, and Single-Device Binding
    const licenseKey = request.headers.get("x-license-key");
    const deviceId = request.headers.get("x-device-id") || "";
    const deviceName = request.headers.get("x-device-name") || "";

    if (licenseKey) {
      const config =
        (await VfpConfig.findOne({ email: user.email })) ||
        (await VfpConfig.findOne({ key: "vfp_sync_config" }));

      if (config) {
        // 1. Check if key is in retired/expired history
        const isReusedOrRetired = (config.usedLicenses || []).some((u: any) => u.key === licenseKey);
        if (isReusedOrRetired) {
          return NextResponse.json(
            {
              success: false,
              licenseExpired: true,
              error: "This license key has expired or was regenerated. Expired keys cannot be reused. Please generate a new key from Sync Settings.",
            },
            { status: 403 }
          );
        }

        // 2. Check if current key is expired by date
        if (config.licenseExpiresAt && new Date() > new Date(config.licenseExpiresAt)) {
          await VfpConfig.updateOne(
            { _id: config._id },
            {
              $addToSet: {
                usedLicenses: {
                  key: config.license,
                  issuedAt: config.licenseIssuedAt,
                  expiredAt: config.licenseExpiresAt,
                  boundDeviceId: config.boundDeviceId,
                  status: "expired",
                },
              },
              $set: { licenseStatus: "expired" },
            }
          );
          return NextResponse.json(
            {
              success: false,
              licenseExpired: true,
              error: "Your license key has expired (30-day validity ended). Please generate a new key from Cloud Dashboard > Sync Settings.",
            },
            { status: 403 }
          );
        }

        // 3. Verify key matches active config
        if (config.license && config.license !== licenseKey) {
          return NextResponse.json(
            { success: false, licenseInvalid: true, error: "Invalid license key." },
            { status: 403 }
          );
        }

        // 4. Single-Device Binding: 1 key can only be used on 1 machine!
        if (deviceId) {
          if (!config.boundDeviceId) {
            // First device to use this key -> Bind it!
            await VfpConfig.updateOne(
              { _id: config._id },
              {
                $set: {
                  boundDeviceId: deviceId,
                  boundDeviceName: deviceName || "Operator Machine",
                  boundAt: new Date(),
                },
              }
            );
          } else if (config.boundDeviceId !== deviceId) {
            // Another device trying to use the same key!
            return NextResponse.json(
              {
                success: false,
                deviceMismatch: true,
                error: `This license key is already bound to another machine (${config.boundDeviceName || "First Device"}). Each license key can only be activated on 1 device. Please generate a separate license key.`,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided in upload request" }, { status: 400 });
    }

    const rawCompanyCode = (formData.get("companyCode") as string) || request.headers.get("x-company-code") || "default";
    const companyCode = rawCompanyCode.trim().toUpperCase().replace(/[^a-zA-Z0-9_-]/g, "_") || "DEFAULT";

    // Base data directory: On EC2 Linux server, use /home/vfpuser/data
    const isLinuxServer = process.platform !== "win32";
    const baseDataDir = (isLinuxServer && fs.existsSync("/home/vfpuser/data"))
      ? "/home/vfpuser/data"
      : path.join(process.cwd(), "data");

    // Clean up any legacy migration directory to prevent disk bloat
    const legacyMigrationDir = path.join(baseDataDir, "migration");
    if (fs.existsSync(legacyMigrationDir)) {
      try {
        fs.rmSync(legacyMigrationDir, { recursive: true, force: true });
      } catch {}
    }

    const userFolder = (user.email || "default").replace(/[^a-zA-Z0-9_-]/g, "_");

    // Company-specific folder: <baseDataDir>/<userFolder>/<companyCode>/
    const uploadDir = path.join(baseDataDir, userFolder, companyCode);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadedFileNames: string[] = [];

    for (const file of files) {
      if (typeof file === "object" && file.name) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = path.basename(file.name);
        
        // Write file to temporary upload directory for immediate parsing and sync
        fs.writeFileSync(path.join(uploadDir, fileName), buffer);
        uploadedFileNames.push(fileName);
      }
    }

    // Get all DBF files present in this company's upload directory (preserving previous uploads for this company)
    const allUploadDbfFiles = fs.readdirSync(uploadDir).filter((f) => f.toLowerCase().endsWith(".dbf"));

    // Merge existing enabled files with all uploaded DBF files
    const existingConfig = await VfpConfig.findOne({ email: user.email }).lean() as any;
    const currentEnabled: string[] = existingConfig?.enabledFiles || [];
    const mergedEnabledFiles = Array.from(new Set([...currentEnabled, ...allUploadDbfFiles]));

    // Save uploaded folder location and merged enabled files in VfpConfig
    await VfpConfig.updateOne(
      { email: user.email },
      {
        $set: {
          email: user.email,
          consoleSyncDir: uploadDir,
          dataDir: uploadDir,
          companyCode: companyCode,
          enabledFiles: mergedEnabledFiles,
        },
      },
      { upsert: true }
    );
    await VfpConfig.updateOne(
      { key: "vfp_sync_config" },
      {
        $set: {
          consoleSyncDir: uploadDir,
          dataDir: uploadDir,
          companyCode: companyCode,
          enabledFiles: mergedEnabledFiles,
        },
      },
      { upsert: true }
    );

    const isFinalBatch = formData.get("isFinalBatch") !== "false";
    const storeOnly = formData.get("storeOnly") === "true";
    const skipDirectSync = formData.get("skipDirectSync") === "true";

    if (!isFinalBatch || storeOnly || skipDirectSync) {
      return NextResponse.json({
        success: true,
        batchComplete: true,
        companyCode,
        uploadedCount: uploadedFileNames.length,
        message: `Uploaded and stored ${uploadedFileNames.length} table(s) in company [${companyCode}] folder.`,
        uploadedFileNames,
      });
    }

    // Decouple direct server database sync to run asynchronously in background
    // so HTTP response returns in <500ms and NEVER triggers Nginx 504 Gateway Timeout
    setImmediate(() => {
      performDirectServerSync(user.email, uploadDir).catch((syncErr) => {
        console.error(`[Background DB Sync Error - ${companyCode}]:`, syncErr.message);
      });
    });

    return NextResponse.json({
      success: true,
      companyCode,
      message: `Uploaded and stored ${uploadedFileNames.length} table(s) for company [${companyCode}]. Background DB synchronization initiated.`,
      uploadedFileNames,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process file upload" },
      { status: 500 }
    );
  }
}
