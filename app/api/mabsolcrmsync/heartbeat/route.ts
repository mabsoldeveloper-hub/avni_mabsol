import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpWorkerHeartbeat from "@/models/VfpWorkerHeartbeat";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpConfig from "@/models/VfpConfig";
import { getCurrentUser } from "@/lib/auth";
import User from "@/models/User";
import { validateUserLoginAccess } from "@/lib/services/superAdmin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
    }

    const {
      workerId = "desktop-worker-1",
      status = "online",
      dataDir = "",
      lastRunReason = "",
      lastError = "",
      email = "",
    } = body;

    // Get current user if authenticated session exists
    const user = await getCurrentUser();
    const targetEmail = (email || user?.email || "").toLowerCase().trim();

    // If account is suspended or deactivated, immediately reject heartbeat with 403
    if (targetEmail) {
      const dbUser = await User.findOne({ email: targetEmail });
      if (dbUser) {
        const accessCheck = await validateUserLoginAccess(dbUser);
        if (!accessCheck.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: accessCheck.message || "Account is suspended or deactivated.",
              accountSuspended: true,
            },
            { status: 403 }
          );
        }
      }
    }

    // Fetch user's active VfpConfig from MongoDB to get dynamic SELECTED FILES FOLDER LOCATION
    const config = (await VfpConfig.findOne({ email: targetEmail })) || (await VfpConfig.findOne({ key: "vfp_sync_config" }));
    const configuredDir: string = config?.consoleSyncDir || config?.sourceDir || config?.dataDir || "";
    const enabledFiles: string[] = config?.enabledFiles || [];

    // Upsert worker heartbeat in MongoDB
    await VfpWorkerHeartbeat.updateOne(
      { workerId },
      {
        $set: {
          workerId,
          status,
          dataDir: dataDir || configuredDir,
          lastSeenAt: new Date(),
          lastRunReason,
          lastError,
          email: targetEmail || "global",
        },
      },
      { upsert: true }
    );

    // Also update a global heartbeat record for quick lookup
    await VfpWorkerHeartbeat.updateOne(
      { workerId: "global-desktop-worker" },
      {
        $set: {
          workerId: "global-desktop-worker",
          status,
          dataDir: dataDir || configuredDir,
          lastSeenAt: new Date(),
          lastRunReason,
          lastError,
          email: targetEmail || "global",
        },
      },
      { upsert: true }
    );

    // Check for pending queued sync commands
    const pendingCommands = await VfpSyncCommand.find({
      status: "queued",
      ...(targetEmail && targetEmail !== "global" ? { email: targetEmail } : {}),
    }).lean();

    return NextResponse.json({
      success: true,
      workerOnline: true,
      configuredDir,
      enabledFiles,
      pendingCommands: pendingCommands.map((c: any) => ({
        id: c._id.toString(),
        command: c.command,
        email: c.email,
        createdAt: c.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process heartbeat" },
      { status: 500 }
    );
  }
}
