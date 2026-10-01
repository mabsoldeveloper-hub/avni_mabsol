import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import VfpConfig from "@/models/VfpConfig";
import { resolveServerCompanyDir, isSchedulerActive, startServerSyncScheduler } from "@/lib/vfp/serverSyncScheduler";

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

    return NextResponse.json({
      success: true,
      autoSync: Boolean((config as any).autoSync),
      autoSyncInterval: (config as any).autoSyncInterval || 10,
      companyCode: (config as any).companyCode || "DEFAULT",
      companyName: (config as any).companyName || "Default Company",
      lastSyncedAt: (config as any).lastSyncedAt || null,
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

    const updateFields: any = {
      autoSync: Boolean(autoSync),
    };

    if (autoSyncInterval !== undefined && Number(autoSyncInterval) > 0) {
      updateFields.autoSyncInterval = Math.max(1, Math.min(10080, Number(autoSyncInterval)));
    }

    if (companyCode) {
      const sanitized = String(companyCode).trim().toUpperCase().replace(/[^a-zA-Z0-9_-]/g, "_") || "DEFAULT";
      updateFields.companyCode = sanitized;
    }

    await VfpConfig.updateOne(
      { email: user.email },
      { $set: updateFields },
      { upsert: true }
    );

    // Ensure server-side background scheduler daemon is running
    startServerSyncScheduler();

    const updatedConfig = await VfpConfig.findOne({ email: user.email }).lean();
    const resolvedDir = resolveServerCompanyDir(updatedConfig);

    const isEnabled = Boolean(autoSync);
    const message = isEnabled
      ? `Server-side Auto-Sync is now ACTIVATED for company [${updateFields.companyCode || (updatedConfig as any)?.companyCode || "DEFAULT"}]. The server will automatically sync data every ${updateFields.autoSyncInterval || (updatedConfig as any)?.autoSyncInterval || 10} minutes in the background, even when the browser is closed.`
      : "Server-side Auto-Sync has been CANCELLED and turned off. Manual file upload is now unlocked.";

    return NextResponse.json({
      success: true,
      autoSync: isEnabled,
      autoSyncInterval: (updatedConfig as any)?.autoSyncInterval || 10,
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
