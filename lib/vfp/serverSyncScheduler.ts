import cron from "node-cron";
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import VfpSyncState from "@/models/VfpSyncState";
import { performDirectServerSync } from "@/lib/vfp/dbfSync";

// Persistent global singleton across Next.js reloads
declare global {
  var __vfpServerSyncScheduler: {
    cronTask: any;
    isSchedulerRunning: boolean;
    runningUserSyncs: Set<string>;
  } | undefined;
}

if (!globalThis.__vfpServerSyncScheduler) {
  globalThis.__vfpServerSyncScheduler = {
    cronTask: null,
    isSchedulerRunning: false,
    runningUserSyncs: new Set<string>(),
  };
}

const schedulerState = globalThis.__vfpServerSyncScheduler!;

/**
 * Helper to resolve the server company DBF directory with STRICT user email isolation.
 * Never falls back to generic shared directories without user email scoping.
 */
export function resolveServerCompanyDir(config: any): string | null {
  if (!config) return null;

  const email = config.email;
  if (!email || typeof email !== "string" || !email.includes("@")) return null;

  const sanitizedEmail = email.replace(/[^a-zA-Z0-9_-]/g, "_");
  const rawCompany = config.companyCode;
  const companySub = rawCompany ? String(rawCompany).trim().replace(/[^a-zA-Z0-9_-]/g, "_") : "DEFAULT";

  const findDbfInDir = (dirPath: string): string | null => {
    try {
      if (!dirPath || !fs.existsSync(dirPath)) return null;
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

  // Strictly user-scoped candidate paths ONLY
  const candidates = [
    // 1. Company specific server folder for THIS user
    path.join(process.cwd(), "data", sanitizedEmail, companySub),
    path.join("/home/vfpuser/data", sanitizedEmail, companySub),
    // 2. User specific server folder for THIS user
    path.join(process.cwd(), "data", sanitizedEmail),
    path.join("/home/vfpuser/data", sanitizedEmail),
    // 3. User configured consoleSyncDir / dataDir (validate it contains user's identifier or exists)
    config.consoleSyncDir,
    config.dataDir,
  ];

  for (const c of candidates) {
    if (c && typeof c === "string") {
      const found = findDbfInDir(c);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Check if the DBF files in target directory have changed compared to last known sync
 */
export async function hasDirectoryChanged(email: string, dirPath: string): Promise<boolean> {
  try {
    if (!dirPath || !fs.existsSync(dirPath)) return false;
    const dbfFiles = fs.readdirSync(dirPath).filter((f) => f.toLowerCase().endsWith(".dbf"));
    if (dbfFiles.length === 0) return false;

    const states = await VfpSyncState.find({ email }).lean();
    const stateMap = new Map<string, any>(
      states.map((s: any) => [s.fileName?.toLowerCase() || s.tableName?.toLowerCase(), s])
    );

    for (const fileName of dbfFiles) {
      const filePath = path.join(dirPath, fileName);
      try {
        const stats = fs.statSync(filePath);
        const baseName = fileName.replace(/\.dbf$/i, "").toLowerCase();
        const state = stateMap.get(fileName.toLowerCase()) || stateMap.get(baseName);
        if (!state || state.status !== "success" || !state.lastFileMtimeMs || Math.abs(state.lastFileMtimeMs - stats.mtimeMs) > 1000) {
          return true; // Detected a new or modified table file
        }
      } catch {
        return true;
      }
    }

    return false; // All files match their recorded sync state
  } catch {
    return true;
  }
}

/**
 * Executes a single scheduled sync iteration for an active config
 */
async function processConfigAutoSync(config: any) {
  const email = config.email;
  if (!email || !config.autoSync || schedulerState.runningUserSyncs.has(email)) return;

  const intervalMins = Math.max(1, config.autoSyncInterval || 10);
  const intervalMs = intervalMins * 60 * 1000;
  const lastSyncMs = config.lastSyncedAt ? new Date(config.lastSyncedAt).getTime() : 0;
  const now = Date.now();

  // If interval has not elapsed yet, skip
  if (lastSyncMs > 0 && now - lastSyncMs < intervalMs) {
    return;
  }

  const targetDir = resolveServerCompanyDir(config);
  if (!targetDir) {
    return;
  }

  const filesChanged = await hasDirectoryChanged(email, targetDir);
  const forceDue = lastSyncMs > 0 && now - lastSyncMs >= intervalMs * 2;

  // If files have not changed and not force due, skip
  if (!filesChanged && !forceDue && lastSyncMs > 0) {
    await VfpConfig.updateOne({ _id: config._id }, { $set: { lastCheckedAt: new Date() } });
    return;
  }

  schedulerState.runningUserSyncs.add(email);
  const companyCode = config.companyCode || "DEFAULT";

  try {
    console.log(`[Auto-Sync Daemon] Starting autonomous server sync for ${email} [${companyCode}] at: ${targetDir}`);
    const result = await performDirectServerSync(email, targetDir);
    
    // Update mtimes in VfpSyncState so hasDirectoryChanged won't re-trigger immediately
    try {
      const dbfFiles = fs.readdirSync(targetDir).filter((f) => f.toLowerCase().endsWith(".dbf"));
      for (const fn of dbfFiles) {
        const stats = fs.statSync(path.join(targetDir, fn));
        const baseName = fn.replace(/\.dbf$/i, "").toLowerCase();
        await VfpSyncState.updateOne(
          { email, fileName: { $regex: new RegExp(`^${baseName}\\.dbf$`, "i") } },
          { $set: { lastFileMtimeMs: stats.mtimeMs, status: "success" } }
        );
      }
    } catch {}

    await VfpConfig.updateOne(
      { _id: config._id },
      {
        $set: {
          lastSyncedAt: new Date(),
          lastCheckedAt: new Date(),
          lastAutoSyncResult: {
            success: true,
            importedTables: result.importedTables,
            importedRows: result.importedRows,
            finishedAt: new Date(),
          },
        },
      }
    );
    console.log(`[Auto-Sync Daemon] Autonomous sync completed for ${email}: ${result.importedTables} tables, ${result.importedRows} rows.`);
  } catch (err: any) {
    console.error(`[Auto-Sync Daemon] Error during sync for ${email}:`, err.message);
    await VfpConfig.updateOne(
      { _id: config._id },
      {
        $set: {
          lastCheckedAt: new Date(),
          lastAutoSyncResult: {
            success: false,
            error: err.message,
            failedAt: new Date(),
          },
        },
      }
    );
  } finally {
    schedulerState.runningUserSyncs.delete(email);
  }
}

/**
 * Main scheduled loop tick: checks all users with autoSync = true
 */
async function runSchedulerTick() {
  try {
    await dbConnect();
    const activeConfigs = await VfpConfig.find({ autoSync: true }).lean();
    if (!activeConfigs || activeConfigs.length === 0) {
      // Nothing to sync when no configs have autoSync enabled
      return;
    }

    for (const config of activeConfigs) {
      await processConfigAutoSync(config);
    }
  } catch (err: any) {
    console.error("[Auto-Sync Daemon Tick Error]:", err.message);
  }
}

/**
 * Initializes and starts the background auto-sync scheduler daemon (singleton)
 */
export function startServerSyncScheduler() {
  if (schedulerState.isSchedulerRunning && schedulerState.cronTask) {
    return;
  }

  // Clear any existing cron task
  if (schedulerState.cronTask) {
    schedulerState.cronTask.stop();
    schedulerState.cronTask = null;
  }

  // Check once per minute
  schedulerState.cronTask = cron.schedule("* * * * *", () => {
    runSchedulerTick().catch((err) => {
      console.error("[Auto-Sync Cron Fatal]:", err);
    });
  });

  schedulerState.isSchedulerRunning = true;
  console.log("[Auto-Sync Daemon] Server background scheduler initialized and active.");
}

/**
 * Stops the background scheduler daemon
 */
export function stopServerSyncScheduler() {
  if (schedulerState.cronTask) {
    schedulerState.cronTask.stop();
    schedulerState.cronTask = null;
  }
  schedulerState.isSchedulerRunning = false;
  schedulerState.runningUserSyncs.clear();
  console.log("[Auto-Sync Daemon] Server background scheduler stopped.");
}

/**
 * Query current scheduler status
 */
export function isSchedulerActive(): boolean {
  return schedulerState.isSchedulerRunning && schedulerState.cronTask !== null;
}
