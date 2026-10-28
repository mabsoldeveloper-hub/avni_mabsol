import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { performDirectServerSync, importSingleDbfFile } from "@/lib/vfp/dbfSync";
import VfpConfig from "@/models/VfpConfig";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import jwt from "jsonwebtoken";
import User from "@/models/User";
import Company from "@/models/Company";
import ExeSyncLog from "@/models/ExeSyncLog";
import { validateUserLoginAccess } from "@/lib/services/superAdmin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes timeout for 200MB+ file uploads and parsing

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

    // Check if this user's EXE access is suspended by Super Admin
    if (user.exeAccessSuspended) {
      const runId = `rej-${Date.now()}`;
      try {
        let isHeadOffice = true;
        let parentCompanyId = null;
        let parentCompanyName = "";
        const uComp = user.companyId ? await Company.findById(user.companyId) : null;
        if (uComp && (uComp.isHeadOffice === false || uComp.parentCompanyId)) {
          isHeadOffice = false;
          parentCompanyId = uComp.parentCompanyId || null;
          if (parentCompanyId) {
            const pComp = await Company.findById(parentCompanyId);
            parentCompanyName = pComp?.companyName || "";
          }
        }
        await ExeSyncLog.create({
          runId,
          companyId: user.companyId || null,
          companyName: uComp?.companyName || "",
          companyCode: uComp?.companyCode || "DEFAULT",
          isHeadOffice,
          parentCompanyId,
          parentCompanyName,
          userId: user._id,
          userName: user.name || "Unknown",
          userEmail: user.email,
          licenseKey: request.headers.get("x-license-key") || "",
          deviceId: request.headers.get("x-device-id") || "",
          deviceName: request.headers.get("x-device-name") || "",
          syncType: "desktop_agent_auto",
          status: "rejected_suspended",
          tablesSynced: [],
          totalRecords: 0,
          durationSeconds: 0,
          error: `Desktop Agent (.EXE) sync access suspended by Super Administrator.${user.exeSuspendedReason ? ` Reason: ${user.exeSuspendedReason}` : ""}`,
        });
      } catch {}

      return NextResponse.json(
        {
          success: false,
          exeSuspended: true,
          error: `Desktop Agent (.EXE) sync access has been suspended for ${user.name || user.email} by Super Administrator.${user.exeSuspendedReason ? ` Reason: ${user.exeSuspendedReason}` : ""}`,
        },
        { status: 403 }
      );
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
      let config: any =
        (await VfpConfig.findOne({ license: licenseKey })) ||
        (await VfpConfig.findOne({ email: user.email })) ||
        (await VfpConfig.findOne({ key: "vfp_sync_config" }));

      if (config) {
        // If config was found by email/key but has a different license, double check if licenseKey exists in another config
        if (config.license && config.license !== licenseKey) {
          const directMatch = await VfpConfig.findOne({ license: licenseKey });
          if (directMatch) {
            config = directMatch;
          } else {
            return NextResponse.json(
              { success: false, licenseInvalid: true, error: "Invalid license key." },
              { status: 403 }
            );
          }
        }

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

        // 4. Device Binding & Multi-Device Validation
        const cleanDeviceId = (deviceId || "").trim().toLowerCase();
        const authorizedDevices: any[] = Array.isArray(config.authorizedDevices) ? config.authorizedDevices : [];
        const anyDeviceMatch = cleanDeviceId
          ? authorizedDevices.find((d: any) => (d.deviceId || "").trim().toLowerCase() === cleanDeviceId)
          : null;

        if (anyDeviceMatch && anyDeviceMatch.status === "suspended") {
          try {
            await ExeSyncLog.create({
              runId: `rej-dev-${Date.now()}`,
              companyId: user.companyId || null,
              companyName: config.companyName || "",
              companyCode: config.companyCode || "DEFAULT",
              userId: user._id,
              userName: user.name || "Unknown",
              userEmail: user.email,
              licenseKey,
              deviceId,
              deviceName: anyDeviceMatch.deviceName || deviceName || deviceId,
              syncType: "desktop_agent_auto",
              status: "rejected_suspended",
              tablesSynced: [],
              totalRecords: 0,
              durationSeconds: 0,
              error: `Workstation machine "${anyDeviceMatch.deviceName || deviceId}" suspended by Super Administrator.${anyDeviceMatch.suspendedReason ? ` Reason: ${anyDeviceMatch.suspendedReason}` : ""}`,
            });
          } catch {}

          return NextResponse.json(
            {
              success: false,
              deviceSuspended: true,
              error: `Workstation machine "${anyDeviceMatch.deviceName || deviceId}" has been suspended by Super Administrator.${anyDeviceMatch.suspendedReason ? ` Reason: ${anyDeviceMatch.suspendedReason}` : ""}`,
            },
            { status: 403 }
          );
        }

        const deviceEntry = anyDeviceMatch && anyDeviceMatch.status === "active" ? anyDeviceMatch : null;

        if (deviceEntry) {
          // Check if this specific device license is expired
          if (deviceEntry.expiresAt && new Date() > new Date(deviceEntry.expiresAt)) {
            return NextResponse.json(
              {
                success: false,
                licenseExpired: true,
                error: `License for machine "${deviceEntry.deviceName || deviceId}" has expired. Please verify your email with OTP in the desktop agent to renew.`,
              },
              { status: 403 }
            );
          }
          // Update last seen timestamp
          VfpConfig.updateOne(
            { _id: config._id, "authorizedDevices.deviceId": { $regex: new RegExp(`^${cleanDeviceId}$`, "i") } },
            { $set: { "authorizedDevices.$.lastSeenAt": new Date(), "authorizedDevices.$.deviceName": deviceName || deviceEntry.deviceName } }
          ).catch(() => {});
        } else if (cleanDeviceId && (config.boundDeviceId || "").trim().toLowerCase() === cleanDeviceId) {
          // Primary bound machine - ensure in authorizedDevices
          await VfpConfig.updateOne(
            { _id: config._id },
            {
              $addToSet: {
                authorizedDevices: {
                  deviceId,
                  deviceName: deviceName || config.boundDeviceName || "Primary Machine",
                  licenseKey,
                  activatedAt: config.boundAt || new Date(),
                  expiresAt: config.licenseExpiresAt,
                  lastSeenAt: new Date(),
                  status: "active",
                  activationEmail: user.email,
                },
              },
            }
          );
        } else if (cleanDeviceId && !config.boundDeviceId && authorizedDevices.length === 0) {
          // First device to use this key -> Bind it!
          await VfpConfig.updateOne(
            { _id: config._id },
            {
              $set: {
                boundDeviceId: deviceId,
                boundDeviceName: deviceName || "Operator Machine",
                boundAt: new Date(),
              },
              $addToSet: {
                authorizedDevices: {
                  deviceId,
                  deviceName: deviceName || "Operator Machine",
                  licenseKey,
                  activatedAt: new Date(),
                  expiresAt: config.licenseExpiresAt,
                  lastSeenAt: new Date(),
                  status: "active",
                  activationEmail: user.email,
                },
              },
            }
          );
        } else if (deviceId) {
          // Unverified device trying to sync with this license key!
          return NextResponse.json(
            {
              success: false,
              deviceMismatch: true,
              requiresVerification: true,
              error: `Machine "${deviceName || deviceId}" is not yet authorized for this license key. Please verify your email with the verification code in the desktop agent before syncing.`,
            },
            { status: 403 }
          );
        }

        // Keep user config's license aligned so future operations know this user is using this license
        if (user?.email) {
          const userKey = "vfp_sync_config_" + user.email;
          try {
            await VfpConfig.updateOne(
              { key: userKey },
              {
                $set: {
                  key: userKey,
                  email: user.email,
                  license: licenseKey,
                  licenseExpiresAt: config.licenseExpiresAt,
                  licenseIssuedAt: config.licenseIssuedAt,
                  licenseStatus: "active",
                  boundDeviceId: deviceId || config.boundDeviceId,
                  boundDeviceName: deviceName || config.boundDeviceName,
                },
              },
              { upsert: true }
            );
          } catch (_cfgErr) {
            await VfpConfig.updateOne(
              { email: user.email },
              {
                $set: {
                  license: licenseKey,
                  licenseExpiresAt: config.licenseExpiresAt,
                  licenseIssuedAt: config.licenseIssuedAt,
                  licenseStatus: "active",
                  boundDeviceId: deviceId || config.boundDeviceId,
                  boundDeviceName: deviceName || config.boundDeviceName,
                },
              }
            ).catch(() => {});
          }
        }
      } else {
        return NextResponse.json(
          { success: false, licenseInvalid: true, error: "Invalid license key. No matching active license was found on the server." },
          { status: 403 }
        );
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
        const targetPath = path.join(uploadDir, fileName);

        // Safe write: clear Windows ReadOnly attribute or lock on existing file
        if (fs.existsSync(targetPath)) {
          try {
            fs.chmodSync(targetPath, 0o666);
          } catch {}
          try {
            fs.unlinkSync(targetPath);
          } catch {}
        }
        
        // Write file to upload directory for immediate parsing and sync
        fs.writeFileSync(targetPath, buffer);
        uploadedFileNames.push(fileName);
      }
    }

    // Get all DBF files present in this company's upload directory (preserving previous uploads for this company)
    const allUploadDbfFiles = fs.readdirSync(uploadDir).filter((f) => f.toLowerCase().endsWith(".dbf"));

    // Merge existing enabled files with all uploaded DBF files
    const existingConfig = await VfpConfig.findOne({ email: user.email }).lean() as any;
    const currentEnabled: string[] = existingConfig?.enabledFiles || [];
    const mergedEnabledFiles = Array.from(new Set([...currentEnabled, ...allUploadDbfFiles]));

    // Save uploaded folder location and merged enabled files in VfpConfig safely
    const userKey = "vfp_sync_config_" + user.email;
    try {
      await VfpConfig.updateOne(
        { key: userKey },
        {
          $set: {
            key: userKey,
            email: user.email,
            consoleSyncDir: uploadDir,
            dataDir: uploadDir,
            companyCode: companyCode,
            enabledFiles: mergedEnabledFiles,
          },
        },
        { upsert: true }
      );
    } catch (_err) {
      await VfpConfig.updateOne(
        { email: user.email },
        {
          $set: {
            consoleSyncDir: uploadDir,
            dataDir: uploadDir,
            companyCode: companyCode,
            enabledFiles: mergedEnabledFiles,
          },
        }
      ).catch(() => {});
    }

    try {
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
        { upsert: false }
      );
    } catch (_err) {}

    const isDirectSync = formData.get("directSync") === "true";

    // Direct Browser Upload & Sync: Parse and import DBF tables synchronously, returning real imported row counts
    if (isDirectSync) {
      let totalImportedRows = 0;
      let syncError: string | undefined;
      const runId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      const dbfFileNames = uploadedFileNames.filter((f) => f.toLowerCase().endsWith(".dbf"));

      for (const fileName of dbfFileNames) {
        const filePath = path.join(uploadDir, fileName);
        const syncResult = await importSingleDbfFile(filePath, runId, user.email, uploadDir);
        totalImportedRows += syncResult.importedCount;
        if (syncResult.error) {
          syncError = syncResult.error;
        }
      }

      if (syncError && totalImportedRows === 0 && dbfFileNames.length > 0) {
        try {
          await ExeSyncLog.create({
            runId,
            companyId: user.companyId || null,
            companyName: user.companyId?.companyName || companyCode,
            companyCode,
            userId: user._id,
            userName: user.name || "Unknown",
            userEmail: user.email,
            licenseKey: request.headers.get("x-license-key") || "",
            deviceId: request.headers.get("x-device-id") || "",
            deviceName: request.headers.get("x-device-name") || "",
            syncType: "desktop_agent_auto",
            status: "failed",
            tablesSynced: dbfFileNames,
            totalRecords: 0,
            durationSeconds: 0,
            error: syncError,
          });
        } catch {}

        return NextResponse.json(
          {
            success: false,
            error: syncError,
            uploadedFileNames,
          },
          { status: 500 }
        );
      }

      try {
        await ExeSyncLog.create({
          runId,
          companyId: user.companyId || null,
          companyName: user.companyId?.companyName || companyCode,
          companyCode,
          userId: user._id,
          userName: user.name || "Unknown",
          userEmail: user.email,
          licenseKey: request.headers.get("x-license-key") || "",
          deviceId: request.headers.get("x-device-id") || "",
          deviceName: request.headers.get("x-device-name") || "",
          syncType: "desktop_agent_auto",
          status: "success",
          tablesSynced: dbfFileNames,
          totalRecords: totalImportedRows,
          durationSeconds: 0,
          completedAt: new Date(),
        });
      } catch {}

      return NextResponse.json({
        success: true,
        companyCode,
        uploadedFileNames,
        result: {
          importedRows: totalImportedRows,
          importedTables: dbfFileNames.length,
          runId,
        },
        message: `Uploaded and synced ${dbfFileNames.length} table(s) (${totalImportedRows.toLocaleString()} rows).`,
      });
    }

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
    // for non-browser/desktop-agent uploads
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
