import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncLog from "@/models/VfpSyncLog";
import VfpSyncState from "@/models/VfpSyncState";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const email = user.email;

    // Find the most recent sync run log entry (action: "sync")
    const latestSyncLog = await VfpSyncLog.findOne({
      email,
      action: "sync",
    })
      .sort({ createdAt: -1 })
      .lean();

    const runId = (latestSyncLog as any)?.runId;
    const syncLogStatus = (latestSyncLog as any)?.status;

    // Fetch all table states for this user
    const tableStates = await VfpSyncState.find({ email })
      .sort({ updatedAt: -1 })
      .lean();

    // Auto-expire stale running logs/states older than 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    await VfpSyncState.updateMany(
      { email, status: "running", updatedAt: { $lt: tenMinsAgo } },
      { $set: { status: "failed", error: "Sync timed out" } }
    );
    await VfpSyncLog.updateMany(
      { email, status: "running", createdAt: { $lt: tenMinsAgo } },
      { $set: { status: "failed", finishedAt: new Date(), message: "Sync timed out" } }
    );

    // Check if any table is currently running (more reliable than just the top-level log)
    const runningStateCount = tableStates.filter((s: any) => s.status === "running").length;

    // isRunning: true if the top-level sync log says "running" OR any table state is "running"
    const isRunning = syncLogStatus === "running" || runningStateCount > 0;

    // Count per-status across all table states
    const done = tableStates.filter((s: any) => s.status === "success").length;
    const failed = tableStates.filter((s: any) => s.status === "failed").length;

    // Find tables currently running
    const runningTables = tableStates
      .filter((s: any) => s.status === "running")
      .map((s: any) => s.tableName || s.fileName || "unknown");

    // Fetch per-table logs for the current run (only completed ones)
    let tableLogs: any[] = [];
    if (runId) {
      tableLogs = await VfpSyncLog.find({
        runId,
        action: "dbf_to_crm",
        status: { $in: ["success", "failed"] },
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    const completedTables = tableLogs
      .filter((l: any) => l.status === "success")
      .map((l: any) => ({
        tableName: l.tableName || l.fileName,
        importedCount: l.importedCount || 0,
        finishedAt: l.finishedAt,
      }));

    const failedTablesList = tableLogs
      .filter((l: any) => l.status === "failed")
      .map((l: any) => ({
        tableName: l.tableName || l.fileName,
        error: l.error,
      }));

    // Total tables = all known table states for this user
    const totalTables = tableStates.length;

    return NextResponse.json({
      success: true,
      isRunning,
      runId,
      syncStatus: syncLogStatus,
      totalTables,
      doneTables: done,
      failedTables: failed,
      runningTables,
      completedTables,
      failedTablesList,
      startedAt: (latestSyncLog as any)?.startedAt || (latestSyncLog as any)?.createdAt,
      finishedAt: (latestSyncLog as any)?.finishedAt,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch progress",
      },
      { status: 500 }
    );
  }
}
