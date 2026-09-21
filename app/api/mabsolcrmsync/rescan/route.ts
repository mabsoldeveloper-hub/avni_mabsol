import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpConfig from "@/models/VfpConfig";
import VfpWorkerHeartbeat from "@/models/VfpWorkerHeartbeat";
import { getCurrentUser } from "@/lib/auth";
import { performDirectServerSync } from "@/lib/vfp/dbfSync";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const config =
      (await VfpConfig.findOne({ email: user.email })) ||
      (await VfpConfig.findOne({ key: "vfp_sync_config" }));

    const dataDir: string =
      config?.consoleSyncDir || config?.sourceDir || config?.dataDir || process.env.VFP_DATA_DIR || "";
    const sanitizedEmail = user.email.replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "vfp_uploads", sanitizedEmail);

    const hasUploadedDbfs =
      fs.existsSync(uploadDir) &&
      fs.readdirSync(uploadDir).some((f) => f.toLowerCase().endsWith(".dbf"));

    const canSyncDirectlyOnServer = (dataDir && fs.existsSync(dataDir)) || hasUploadedDbfs;

    if (canSyncDirectlyOnServer) {
      const syncResult = await performDirectServerSync(user.email);
      return NextResponse.json({
        success: true,
        message: `DBF rescan & synchronization completed! Synced ${syncResult.importedTables} table(s), ${syncResult.importedRows} row(s).`,
        result: syncResult,
      });
    } else {
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
          ? `Rescan command queued for active desktop worker!`
          : `Rescan command queued! Local worker script ('run_local_sync.bat') is currently offline.`,
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
        error: error instanceof Error ? error.message : "Unable to queue rescan",
      },
      { status: 500 }
    );
  }
}
