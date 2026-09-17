import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";
import VfpWorkerHeartbeat from "@/models/VfpWorkerHeartbeat";
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

    const dataDir: string =
      config?.consoleSyncDir || config?.sourceDir || config?.dataDir || process.env.VFP_DATA_DIR || "";

    const sanitizedEmail = user.email.replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "vfp_uploads", sanitizedEmail);

    const hasUploadedDbfs =
      fs.existsSync(uploadDir) &&
      fs.readdirSync(uploadDir).some((f) => f.toLowerCase().endsWith(".dbf"));

    const canSyncDirectlyOnServer = (dataDir && fs.existsSync(dataDir)) || hasUploadedDbfs;

    if (canSyncDirectlyOnServer) {
      // Execute direct server-side DBF sync in background so HTTP connection does not time out on large DBF tables
      performDirectServerSync(user.email).catch((err) => {
        console.error("Direct server sync background error:", err);
      });

      return NextResponse.json({
        success: true,
        message: `DBF synchronization started in background! Processing all selected DBF tables...`,
        result: {
          importedTables: 0,
          importedRows: 0,
          background: true,
        },
      });
    } else {
      // AWS Live Cloud mode: Folder is on client's Windows PC 
      // Queue command for the desktop sync worker
      await VfpSyncCommand.create({
        email: user.email,
        command: user.email,
        status: "queued",
        createdAt: new Date(),
      });

      const heartbeat = await VfpWorkerHeartbeat.findOne({}).sort({ lastSeenAt: -1 }).lean();
      const lastSeenAt = (heartbeat as any)?.lastSeenAt ? new Date((heartbeat as any).lastSeenAt) : null;
      const workerOnline = lastSeenAt && Date.now() - lastSeenAt.getTime() < 30000;

      return NextResponse.json({
        success: true,
        queued: true,
        workerOnline,
        message: workerOnline
          ? `Sync command queued! Local desktop sync worker is ONLINE and syncing ${dataDir || "DBF folder"}.`
          : `Sync command queued in Cloud! Local worker is OFFLINE. Start 'run_local_sync.bat' on your local PC or upload DBF files.`,
        result: {
          importedTables: 0,
          importedRows: 0,
          queued: true,
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
