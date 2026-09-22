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

    if (!isFinalBatch) {
      return NextResponse.json({
        success: true,
        batchComplete: true,
        companyCode,
        uploadedCount: uploadedFileNames.length,
        message: `Staged ${uploadedFileNames.length} table(s) in company [${companyCode}] folder.`,
      });
    }

    // Always execute direct sync into database upon upload
    const syncResult = await performDirectServerSync(user.email, uploadDir);

    return NextResponse.json({
      success: true,
      companyCode,
      message: `Uploaded and synced ${syncResult.importedTables} table(s) (${syncResult.importedRows} rows) directly into database!`,
      result: syncResult,
      uploadedFileNames,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process file upload" },
      { status: 500 }
    );
  }
}
