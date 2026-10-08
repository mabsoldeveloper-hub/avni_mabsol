import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import VfpConfig from "@/models/VfpConfig";
import VfpSyncState from "@/models/VfpSyncState";
import VfpSyncLog from "@/models/VfpSyncLog";
import { resolveServerCompanyDir, isSchedulerActive, startServerSyncScheduler, processConfigAutoSync } from "@/lib/vfp/serverSyncScheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const config = (await VfpConfig.findOne({ email: user.email })) ||
      (await VfpConfig.findOne({ key: "vfp_sync_config" })) ||
      {};

    const serverDir = resolveServerCompanyDir(config);
    const intervalMins = (config as any).autoSyncInterval || 10;
    const isAutoSync = Boolean((config as any).autoSync);
    const lastSyncMs = (config as any).lastSyncedAt ? new Date((config as any).lastSyncedAt).getTime() : 0;
    const nextSyncAt = isAutoSync && lastSyncMs > 0 ? new Date(lastSyncMs + intervalMins * 60 * 1000).toISOString() : null;

    return NextResponse.json({
      success: true,
      autoSync: isAutoSync,
      autoSyncInterval: intervalMins,
      companyCode: (config as any).companyCode || "DEFAULT",
      companyName: (config as any).companyName || "Default Company",
      lastSyncedAt: (config as any).lastSyncedAt || null,
      nextSyncAt,
      serverDir,
      schedulerActive: isSchedulerActive(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch auto-sync status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { autoSync, autoSyncInterval, companyCode } = body;

    const isEnabled = Boolean(autoSync);
    const targetInterval = autoSyncInterval !== undefined && Number(autoSyncInterval) > 0
      ? Math.max(1, Math.min(10080, Number(autoSyncInterval)))
      : 10;

    const updateFields: any = {
      autoSync: isEnabled,
      autoSyncInterval: targetInterval,
    };

    if (companyCode) {
      const sanitized = String(companyCode).trim().toUpperCase().replace(/[^a-zA-Z0-9_-]/g, "_") || "DEFAULT";
      updateFields.companyCode = sanitized;
    }

    const res = await VfpConfig.updateMany(
      { $or: [{ email: user.email }, { key: "vfp_sync_config_" + user.email }, { key: "vfp_sync_config" }] },
      { $set: updateFields }
    );
    if (res.matchedCount === 0) {
      await VfpConfig.updateOne(
        { email: user.email },
        { $set: { ...updateFields, email: user.email, key: "vfp_sync_config_" + user.email } },
        { upsert: true }
      );
    }

    if (!isEnabled) {
      // Clean up running states and logs so UI stops polling immediately
      await VfpSyncState.updateMany(
        { email: user.email, status: "running" },
        { $set: { status: "cancelled" } }
      );
      await VfpSyncLog.updateMany(
        { email: user.email, status: "running" },
        { $set: { status: "cancelled", finishedAt: new Date() } }
      );
      if (globalThis.__vfpServerSyncScheduler) {
        globalThis.__vfpServerSyncScheduler.runningUserSyncs.delete(user.email);
      }
    }

    // Ensure server-side background scheduler daemon is running if enabled
    startServerSyncScheduler();

    const updatedConfig = await VfpConfig.findOne({ email: user.email }).lean();
    const resolvedDir = resolveServerCompanyDir(updatedConfig);

    if (isEnabled && updatedConfig) {
      // Trigger immediate background sync so data is imported into the database right away!
      processConfigAutoSync(updatedConfig, true).catch((err) => {
        console.error("[AutoSync] Immediate auto-sync trigger failed:", err);
      });
    }

    const message = isEnabled
      ? `Server-side Auto-Sync is now ACTIVATED for company [${updateFields.companyCode || (updatedConfig as any)?.companyCode || "DEFAULT"}]. The server is now synchronizing data immediately and will continue every ${targetInterval} minutes in the background.`
      : "Server-side Auto-Sync has been CANCELLED and turned off. Manual file upload is now unlocked.";

    return NextResponse.json({
      success: true,
      autoSync: isEnabled,
      autoSyncInterval: (updatedConfig as any)?.autoSyncInterval || targetInterval,
      companyCode: (updatedConfig as any)?.companyCode || "DEFAULT",
      serverDir: resolvedDir,
      schedulerActive: isSchedulerActive(),
      message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update auto-sync settings" },
      { status: 500 }
    );
  }
}
