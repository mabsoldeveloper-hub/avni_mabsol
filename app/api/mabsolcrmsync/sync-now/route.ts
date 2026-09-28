import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";
import VfpWorkerHeartbeat from "@/models/VfpWorkerHeartbeat";
import VfpSyncState from "@/models/VfpSyncState";
import { getCurrentUser } from "@/lib/auth";
import { performDirectServerSync } from "@/lib/vfp/dbfSync";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
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
      userName = config?.userName || user.name || "Unknown",
      companyName = config?.companyName || (user.companyId as any)?.companyName || "Unknown",
      license = config?.license || "Unknown",
      vfpExePath = config?.vfpExePath || "Unknown",
    } = body;

    await VfpSettingLog.create({
      email: user.email,
      ipAddress,
      userName,
      companyName,
      license,
      vfpExePath,
      action: "sync_triggered",
      status: "success",
      message: `Sync manually triggered from dashboard.`,
    });

    const sanitizedEmail = user.email.replace(/[^a-zA-Z0-9_-]/g, "_");
    const rawCompany = (config as any)?.companyCode;
    const companySub = rawCompany ? String(rawCompany).replace(/[^a-zA-Z0-9_-]/g, "_") : "DEFAULT";

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
    const candidates = [
      config?.consoleSyncDir,
      config?.sourceDir,
      config?.dataDir,
      path.join("/home/vfpuser/data", sanitizedEmail, companySub),
      path.join("/home/vfpuser/data", sanitizedEmail),
      "/home/vfpuser/data",
      path.join(process.cwd(), "data", sanitizedEmail, companySub),
      path.join(process.cwd(), "data", sanitizedEmail),
      path.join(process.cwd(), "data", "vfp_uploads", sanitizedEmail),
      path.join(process.cwd(), "data"),
    ];

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
      // Execute direct server-side sync in background so HTTP connection does not time out
      performDirectServerSync(user.email, resolvedDataDir).catch((err) => {
        console.error("Direct server sync background error:", err);
      });

      return NextResponse.json({
        success: true,
        message: `Synchronization started in background! Importing tables into database...`,
        result: {
          importedTables: 0,
          importedRows: 0,
          background: true,
        },
      });
    } else {
      // Check if tables have already been synced in database
      const syncedCount = await VfpSyncState.countDocuments({
        $or: [{ email: user.email }, { email: { $exists: false } }, { email: "" }],
        status: "success",
      });

      if (syncedCount > 0) {
        return NextResponse.json({
          success: true,
          queued: false,
          alreadySynced: true,
          message: `All ${syncedCount} table(s) are already synced and up to date in the database. (Server disk storage is clean)`,
          result: {
            importedTables: syncedCount,
            importedRows: 0,
            alreadySynced: true,
          },
        });
      }

      return NextResponse.json({
        success: true,
        queued: false,
        alreadySynced: true,
        message: `All data is up to date. Drag & drop files or run Desktop Agent to sync new updates.`,
        result: {
          importedTables: 0,
          importedRows: 0,
          alreadySynced: true,
        },
      });
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
