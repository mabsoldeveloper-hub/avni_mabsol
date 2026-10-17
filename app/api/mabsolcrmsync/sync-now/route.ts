import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";
import VfpWorkerHeartbeat from "@/models/VfpWorkerHeartbeat";
import { getCurrentUser } from "@/lib/auth";
import { performDirectServerSync, CORE_16_SYNC_TABLES } from "@/lib/vfp/dbfSync";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import Company from "@/models/Company";
import ExeSyncLog from "@/models/ExeSyncLog";

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
      if (licenseKey) {
        const query: any = { license: licenseKey };
        if (agentEmail) query.email = agentEmail;
        const config = (await VfpConfig.findOne(query)) || (agentEmail ? await VfpConfig.findOne({ email: agentEmail }) : null);
        if (config && config.email) {
          user = await User.findOne({ email: config.email });
        }
      } else if (agentEmail) {
        user = await User.findOne({ email: agentEmail });
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body might be empty
    }

    // Get active VFP configuration for fallbacks
    const config =
      (await VfpConfig.findOne({ email: user.email })) ||
      (await VfpConfig.findOne({ key: "vfp_sync_config" }));

    const {
      companyCode: bodyCompanyCode,
      companyId: bodyCompanyId,
      companyName: bodyCompanyName,
      force = true,
      enabledFiles,
      userName = config?.userName || user.name || "Unknown",
      license = config?.license || "Unknown",
      vfpExePath = config?.vfpExePath || "Unknown",
    } = body;

    const targetCompanyCode = bodyCompanyCode || (config as any)?.companyCode || "DEFAULT";
    const targetCompanyName = bodyCompanyName || (config as any)?.companyName || (user.companyId as any)?.companyName || targetCompanyCode;

    // Check if this user's EXE sync access has been suspended by Super Admin
    if (user.exeAccessSuspended) {
      let isHeadOffice = true;
      let parentCompanyId = null;
      let parentCompanyName = "";

      try {
        const uComp = user.companyId ? await Company.findById(user.companyId) : null;
        if (uComp) {
          if (uComp.isHeadOffice === false || uComp.parentCompanyId) {
            isHeadOffice = false;
            parentCompanyId = uComp.parentCompanyId || null;
            if (parentCompanyId) {
              const pComp = await Company.findById(parentCompanyId);
              parentCompanyName = pComp?.companyName || "";
            }
          }
        }
      } catch {}

      await ExeSyncLog.create({
        runId: `rej-${Date.now()}`,
        companyId: user.companyId || null,
        companyName: targetCompanyName,
        companyCode: targetCompanyCode,
        isHeadOffice,
        parentCompanyId,
        parentCompanyName,
        userId: user._id,
        userName: user.name || userName,
        userEmail: user.email,
        licenseKey: license || "",
        syncType: "portal_triggered",
        status: "rejected_suspended",
        tablesSynced: [],
        totalRecords: 0,
        durationSeconds: 0,
        ipAddress,
        error: `Desktop Agent (.EXE) sync access has been suspended for ${user.name || user.email} by Super Administrator.${user.exeSuspendedReason ? ` Reason: ${user.exeSuspendedReason}` : ""}`,
      });

      return NextResponse.json(
        {
          success: false,
          exeSuspended: true,
          error: `Desktop Agent (.EXE) sync access has been suspended for ${user.name || user.email} by Super Administrator.${user.exeSuspendedReason ? ` Reason: ${user.exeSuspendedReason}` : ""}`,
        },
        { status: 403 }
      );
    }

    await VfpSettingLog.create({
      email: user.email,
      ipAddress,
      userName,
      companyName: targetCompanyName,
      license,
      vfpExePath,
      action: "sync_triggered",
      status: "success",
      message: `Sync manually triggered from dashboard for company [${targetCompanyCode}].`,
      ...(targetCompanyCode ? { companyCode: targetCompanyCode } : {}),
    });

    const sanitizedEmail = user.email.replace(/[^a-zA-Z0-9_-]/g, "_");
    const sanitizedCompany = targetCompanyCode ? String(targetCompanyCode).trim().toUpperCase().replace(/[^a-zA-Z0-9_-]/g, "_") : "DEFAULT";

    // Helper to find directory containing DBF files
    const findDbfInDir = (dirPath: string): string | null => {
      try {
        if (!fs.existsSync(dirPath)) return null;
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        if (entries.some((e) => !e.isDirectory() && e.name.toLowerCase().endsWith(".dbf"))) {
          return dirPath;
        }
        for (const e of entries) {
          if (e.isDirectory()) {
            const sub = path.join(dirPath, e.name);
            const found = findDbfInDir(sub);
            if (found) return found;
          }
        }
      } catch {}
      return null;
    };

    let resolvedDataDir: string | null = null;
    const baseDataRoots = [
      "/home/vfpuser/data",
      path.join(process.cwd(), "data"),
      path.join(process.cwd(), "data", "vfp_uploads"),
    ];

    const candidates: (string | undefined | null)[] = [
      // 1. Direct path for logged-in user and company
      path.join("/home/vfpuser/data", sanitizedEmail, sanitizedCompany),
      path.join(process.cwd(), "data", sanitizedEmail, sanitizedCompany),
      path.join(process.cwd(), "data", "vfp_uploads", sanitizedEmail, sanitizedCompany),
    ];

    // 2. Direct company folder under base roots
    for (const root of baseDataRoots) {
      candidates.push(path.join(root, sanitizedCompany));
    }

    // 3. Search all user folders under base roots for this company folder
    for (const root of baseDataRoots) {
      try {
        if (fs.existsSync(root)) {
          const entries = fs.readdirSync(root, { withFileTypes: true });
          for (const ent of entries) {
            if (ent.isDirectory()) {
              const compFolder = path.join(root, ent.name, sanitizedCompany);
              if (!candidates.includes(compFolder)) {
                candidates.push(compFolder);
              }
            }
          }
        }
      } catch {}
    }

    // 4. Fallbacks
    candidates.push(
      config?.consoleSyncDir,
      config?.sourceDir,
      config?.dataDir,
      path.join("/home/vfpuser/data", sanitizedEmail),
      path.join(process.cwd(), "data", sanitizedEmail),
      path.join(process.cwd(), "data", "vfp_uploads", sanitizedEmail),
      "/home/vfpuser/data",
      path.join(process.cwd(), "data")
    );

    for (const c of candidates) {
      if (c) {
        const found = findDbfInDir(c);
        if (found) {
          resolvedDataDir = found;
          break;
        }
      }
    }

    if (resolvedDataDir) {
      let dbfFiles = fs.existsSync(resolvedDataDir)
        ? fs.readdirSync(resolvedDataDir).filter((f) => {
            if (!f.toLowerCase().endsWith(".dbf")) return false;
            const base = f.replace(/\.dbf$/i, "").trim().replace(/[\._][a-zA-Z]?\d+$/i, "").toLowerCase();
            return CORE_16_SYNC_TABLES.has(base);
          })
        : [];

      if (Array.isArray(enabledFiles) && enabledFiles.length > 0) {
        const set = new Set(enabledFiles.map((f: string) => f.toLowerCase().replace(/\.dbf$/i, "")));
        dbfFiles = dbfFiles.filter((f) => set.has(f.toLowerCase().replace(/\.dbf$/i, "")));
      }

      // Execute direct server-side sync in background targeting the selected company and selected files
      performDirectServerSync(user.email, resolvedDataDir, {
        companyCode: targetCompanyCode,
        companyId: bodyCompanyId,
        companyName: targetCompanyName,
        force: true,
        enabledFiles: Array.isArray(enabledFiles) && enabledFiles.length > 0 ? enabledFiles : undefined,
      }).catch((err) => {
        console.error(`Direct server sync background error for company [${targetCompanyCode}]:`, err);
      });

      return NextResponse.json({
        success: true,
        message: `Synchronization started for company [${targetCompanyCode}] (${dbfFiles.length} tables found)! Importing tables into database in real-time...`,
        result: {
          importedTables: dbfFiles.length,
          importedRows: 0,
          background: true,
          companyCode: targetCompanyCode,
          dataDir: resolvedDataDir,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `No DBF files found on server for company [${targetCompanyCode}]. Please upload files or sync via desktop agent.`,
      }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to queue sync",
      },
      { status: 500 }
    );
  }
}
