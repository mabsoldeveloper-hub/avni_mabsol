import cron from "node-cron";
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import VfpSyncState from "@/models/VfpSyncState";
import { performDirectServerSync, CORE_16_SYNC_TABLES } from "@/lib/vfp/dbfSync";

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

  const email = config.email || "global";
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

  const baseDataRoots = [
    "/home/vfpuser/data",
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "data", "vfp_uploads"),
  ];

  // Candidates for company server directory
  const candidates: (string | undefined | null)[] = [
    // 1. Company specific server folder for THIS user
    path.join("/home/vfpuser/data", sanitizedEmail, companySub),
    path.join(process.cwd(), "data", sanitizedEmail, companySub),
    path.join(process.cwd(), "data", "vfp_uploads", sanitizedEmail, companySub),
  ];

  // 2. Direct company folder under base roots
  for (const root of baseDataRoots) {
    candidates.push(path.join(root, companySub));
  }

  // 3. Across all user folders under base roots
  for (const root of baseDataRoots) {
    try {
      if (fs.existsSync(root)) {
        const subDirs = fs.readdirSync(root, { withFileTypes: true });
        for (const s of subDirs) {
          if (s.isDirectory()) {
            candidates.push(path.join(root, s.name, companySub));
          }
        }
      }
    } catch {}
  }

  // 4. Fallbacks
  candidates.push(
    path.join("/home/vfpuser/data", sanitizedEmail),
    path.join(process.cwd(), "data", sanitizedEmail),
    config.consoleSyncDir,
    config.dataDir,
    "/home/vfpuser/data",
    path.join(process.cwd(), "data"),
  );

  for (const c of (candidates.filter(Boolean) as string[])) {
    const found = findDbfInDir(c);
    if (found) return found;
  }

  return null;
}

/**
 * Check if the DBF files in target directory have changed compared to last known sync
 */
export async function hasDirectoryChanged(email: string, dirPath: string, companyCode?: string): Promise<boolean> {
  try {
    if (!dirPath || !fs.existsSync(dirPath)) return false;
    const dbfFiles = fs.readdirSync(dirPath).filter((f) => {
      if (!f.toLowerCase().endsWith(".dbf")) return false;
      const base = f.replace(/\.dbf$/i, "").trim().replace(/[\._][a-zA-Z]?\d+$/i, "").toLowerCase();
      return CORE_16_SYNC_TABLES.has(base);
    });
    if (dbfFiles.length === 0) return false;

    const query: any = { email };
    if (companyCode) query.companyCode = companyCode;

    const states = await VfpSyncState.find(query).lean();
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
export async function processConfigAutoSync(config: any, forceRun: boolean = false) {
  const email = config.email;
  if (!email || !config.autoSync || schedulerState.runningUserSyncs.has(email)) return;

  const intervalMins = Math.max(1, config.autoSyncInterval || 10);
  const intervalMs = intervalMins * 60 * 1000;
  const lastSyncMs = config.lastSyncedAt ? new Date(config.lastSyncedAt).getTime() : 0;
  const now = Date.now();

  const isDue = lastSyncMs === 0 || (now - lastSyncMs >= intervalMs);

  // If interval has not elapsed yet and not forced, check if files changed early
  if (!forceRun && !isDue) {
    const targetDir = resolveServerCompanyDir(config);
    if (!targetDir) return;
    const companyCode = config.companyCode || "DEFAULT";
    const earlyChanged = await hasDirectoryChanged(email, targetDir, companyCode);
    if (!earlyChanged) {
      return; // Not due yet and no files changed
    }
    console.log(`[Auto-Sync Daemon] Early sync triggered for ${email}: File change detected before interval.`);
  }

  const targetDir = resolveServerCompanyDir(config);
  if (!targetDir) {
    console.warn(`[Auto-Sync Daemon] Could not resolve server company directory for ${email}`);
    return;
  }

  const companyCode = config.companyCode || "DEFAULT";
  const companyName = config.companyName || companyCode;

  schedulerState.runningUserSyncs.add(email);

  try {
    console.log(`[Auto-Sync Daemon] Starting autonomous server sync for ${email} [${companyCode}] (every ${intervalMins}m) at: ${targetDir}`);
    const result = await performDirectServerSync(email, targetDir, {
      companyCode,
      companyName,
      force: true,
      enabledFiles: [], // Background auto-sync processes all 16 core business tables
    });
    
    // Update mtimes in VfpSyncState so hasDirectoryChanged stays consistent
    try {
      const dbfFiles = fs.readdirSync(targetDir).filter((f) => {
        if (!f.toLowerCase().endsWith(".dbf")) return false;
        const base = f.replace(/\.dbf$/i, "").trim().replace(/[\._][a-zA-Z]?\d+$/i, "").toLowerCase();
        return CORE_16_SYNC_TABLES.has(base);
      });
      for (const fn of dbfFiles) {
        const stats = fs.statSync(path.join(targetDir, fn));
        const baseName = fn.replace(/\.dbf$/i, "").toLowerCase();
        await VfpSyncState.updateOne(
          { email, fileName: { $regex: new RegExp(`^${baseName}\\.dbf$`, "i") }, ...(companyCode ? { companyCode } : {}) },
          { $set: { lastFileMtimeMs: stats.mtimeMs, status: "success", ...(companyCode ? { companyCode } : {}) } }
        );
      }
    } catch {}

    await VfpConfig.updateMany(
      { $or: [{ email }, { key: "vfp_sync_config_" + email }, { key: "vfp_sync_config" }] },
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
    console.log(`[Auto-Sync Daemon] Autonomous sync completed for ${email} [${companyCode}]: ${result.importedTables} tables, ${result.importedRows} rows.`);
  } catch (err: any) {
    console.error(`[Auto-Sync Daemon] Error during sync for ${email}:`, err.message);
    await VfpConfig.updateMany(
      { $or: [{ email }, { key: "vfp_sync_config_" + email }, { key: "vfp_sync_config" }] },
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

    const seenEmails = new Set<string>();
    for (const config of activeConfigs) {
      const email = config.email || "global";
      if (seenEmails.has(email)) continue;
      seenEmails.add(email);
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
    try {
      schedulerState.cronTask.stop();
    } catch {}
    schedulerState.cronTask = null;
  }

  // Check every 30 seconds for precise schedule alignment
  schedulerState.cronTask = cron.schedule("*/30 * * * * *", () => {
    runSchedulerTick().catch((err) => {
      console.error("[Auto-Sync Cron Fatal]:", err);
    });
  });

  schedulerState.isSchedulerRunning = true;
  console.log("[Auto-Sync Daemon] Server background scheduler initialized and active (30s interval tick).");
  
  // Also run an immediate tick right now so overdue/pending syncs run immediately
  runSchedulerTick().catch(() => {});
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
